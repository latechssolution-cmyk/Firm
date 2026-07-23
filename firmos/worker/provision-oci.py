#!/usr/bin/env python3
"""Idempotently provision an OCI Always-Free ARM VM for the FirmOS worker:
VCN + internet gateway + route table + security list + subnet + instance.
Re-running reuses whatever already exists (matched by display name)."""
import os, sys, time, oci

cfg = oci.config.from_file("~/.oci/config", "DEFAULT")
tenancy = cfg["tenancy"]
comp_id = tenancy  # root compartment
net = oci.core.VirtualNetworkClient(cfg)
compute = oci.core.ComputeClient(cfg)
ident = oci.identity.IdentityClient(cfg)

PREFIX = "firmos"
ad = ident.list_availability_domains(tenancy).data[0].name
pub_key = open(os.path.expanduser("~/.ssh/firmos_oci.pub")).read().strip()

# Shape: try full free allocation, fall back to smaller on capacity error.
SHAPE = "VM.Standard.A1.Flex"
SHAPE_TRIES = [(1, 6), (2, 12), (4, 24)]  # (ocpus, gb) — 1/6 first for best capacity odds

def find(items, name):
    for i in items:
        if i.display_name == name and getattr(i, "lifecycle_state", "AVAILABLE") not in ("TERMINATED", "TERMINATING"):
            return i
    return None

def wait(get, ok=("AVAILABLE", "RUNNING")):
    for _ in range(60):
        s = get().data
        if s.lifecycle_state in ok: return s
        if s.lifecycle_state in ("FAILED", "TERMINATED"): raise RuntimeError(f"entered {s.lifecycle_state}")
        time.sleep(3)
    raise TimeoutError("wait timed out")

# 1. VCN
vcn = find(net.list_vcns(comp_id).data, f"{PREFIX}-vcn")
if not vcn:
    vcn = net.create_vcn(oci.core.models.CreateVcnDetails(
        cidr_block="10.0.0.0/16", display_name=f"{PREFIX}-vcn", compartment_id=comp_id)).data
    vcn = wait(lambda: net.get_vcn(vcn.id))
    print("created VCN")
print("VCN:", vcn.id[-12:])

# 2. Internet gateway
ig = find(net.list_internet_gateways(comp_id, vcn_id=vcn.id).data, f"{PREFIX}-ig")
if not ig:
    ig = net.create_internet_gateway(oci.core.models.CreateInternetGatewayDetails(
        compartment_id=comp_id, vcn_id=vcn.id, is_enabled=True, display_name=f"{PREFIX}-ig")).data
    ig = wait(lambda: net.get_internet_gateway(ig.id))
    print("created internet gateway")

# 3. Route table (default) → IG
rt = net.get_route_table(vcn.default_route_table_id).data
if not rt.route_rules:
    net.update_route_table(rt.id, oci.core.models.UpdateRouteTableDetails(route_rules=[
        oci.core.models.RouteRule(destination="0.0.0.0/0", destination_type="CIDR_BLOCK", network_entity_id=ig.id)]))
    print("added default route → IG")

# 4. Security list: allow SSH in; all out
sl = net.get_security_list(vcn.default_security_list_id).data
def has_ssh(rules):
    for r in rules:
        if r.tcp_options and r.tcp_options.destination_port_range and r.tcp_options.destination_port_range.min == 22:
            return True
    return False
if not has_ssh(sl.ingress_security_rules):
    ingress = list(sl.ingress_security_rules) + [oci.core.models.IngressSecurityRule(
        protocol="6", source="0.0.0.0/0",
        tcp_options=oci.core.models.TcpOptions(
            destination_port_range=oci.core.models.PortRange(min=22, max=22)))]
    net.update_security_list(sl.id, oci.core.models.UpdateSecurityListDetails(ingress_security_rules=ingress))
    print("opened port 22")

# 5. Subnet (public)
sn = find(net.list_subnets(comp_id, vcn_id=vcn.id).data, f"{PREFIX}-subnet")
if not sn:
    sn = net.create_subnet(oci.core.models.CreateSubnetDetails(
        compartment_id=comp_id, vcn_id=vcn.id, cidr_block="10.0.1.0/24",
        display_name=f"{PREFIX}-subnet", prohibit_public_ip_on_vnic=False)).data
    sn = wait(lambda: net.get_subnet(sn.id))
    print("created subnet")

# 6. Image (latest Ubuntu 24.04 ARM)
img = next(i for i in compute.list_images(comp_id, operating_system="Canonical Ubuntu",
           shape=SHAPE, sort_by="TIMECREATED", sort_order="DESC").data if "24.04" in i.display_name)
print("image:", img.display_name)

# 7. Instance (reuse if present)
existing = find(compute.list_instances(comp_id).data, f"{PREFIX}-worker")
if existing:
    inst = existing
    print("reusing instance", inst.lifecycle_state)
else:
    last_err = None
    for ocpus, gb in SHAPE_TRIES:
        try:
            print(f"launching {SHAPE} {ocpus}ocpu/{gb}gb …")
            inst = compute.launch_instance(oci.core.models.LaunchInstanceDetails(
                compartment_id=comp_id, availability_domain=ad, display_name=f"{PREFIX}-worker",
                shape=SHAPE, shape_config=oci.core.models.LaunchInstanceShapeConfigDetails(ocpus=ocpus, memory_in_gbs=gb),
                create_vnic_details=oci.core.models.CreateVnicDetails(subnet_id=sn.id, assign_public_ip=True),
                source_details=oci.core.models.InstanceSourceViaImageDetails(image_id=img.id, boot_volume_size_in_gbs=50),
                metadata={"ssh_authorized_keys": pub_key})).data
            print("launch accepted")
            break
        except oci.exceptions.ServiceError as e:
            last_err = e
            if e.status in (500, 429) or "capacity" in str(e.message).lower():
                print(f"  capacity/limit issue at {ocpus}/{gb}: {e.message[:80]} — trying next size")
                continue
            raise
    else:
        print("ALL_SHAPES_FAILED:", last_err.message if last_err else "?")
        sys.exit(2)

inst = wait(lambda: compute.get_instance(inst.id))
print("instance RUNNING:", inst.id[-12:])

# 8. Public IP
vnics = compute.list_vnic_attachments(comp_id, instance_id=inst.id).data
ip = None
for _ in range(20):
    vnics = compute.list_vnic_attachments(comp_id, instance_id=inst.id).data
    if vnics and vnics[0].vnic_id:
        ip = net.get_vnic(vnics[0].vnic_id).data.public_ip
        if ip: break
    time.sleep(3)
print("PUBLIC_IP:", ip)
print("SSH: ssh -i ~/.ssh/firmos_oci ubuntu@%s" % ip)
