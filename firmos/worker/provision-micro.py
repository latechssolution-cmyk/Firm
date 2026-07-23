#!/usr/bin/env python3
"""Fallback: launch the AMD Always-Free VM.Standard.E2.1.Micro (x86, 1GB)
into the firmos VCN/subnet already created by provision-oci.py."""
import os, sys, time, oci

cfg = oci.config.from_file("~/.oci/config", "DEFAULT")
tenancy = cfg["tenancy"]; comp_id = tenancy
net = oci.core.VirtualNetworkClient(cfg); compute = oci.core.ComputeClient(cfg)
ident = oci.identity.IdentityClient(cfg)
PREFIX = "firmos"; SHAPE = "VM.Standard.E2.1.Micro"
ad = ident.list_availability_domains(tenancy).data[0].name
pub_key = open(os.path.expanduser("~/.ssh/firmos_oci.pub")).read().strip()

def find(items, name):
    for i in items:
        if i.display_name == name and getattr(i, "lifecycle_state", "AVAILABLE") not in ("TERMINATED", "TERMINATING"):
            return i
    return None
def wait(get, ok=("AVAILABLE", "RUNNING")):
    for _ in range(80):
        s = get().data
        if s.lifecycle_state in ok: return s
        if s.lifecycle_state in ("FAILED", "TERMINATED"): raise RuntimeError(s.lifecycle_state)
        time.sleep(3)
    raise TimeoutError()

vcn = find(net.list_vcns(comp_id).data, f"{PREFIX}-vcn")
sn = find(net.list_subnets(comp_id, vcn_id=vcn.id).data, f"{PREFIX}-subnet")
img = next(i for i in compute.list_images(comp_id, operating_system="Canonical Ubuntu",
           shape=SHAPE, sort_by="TIMECREATED", sort_order="DESC").data if "24.04" in i.display_name)
print("image:", img.display_name)

inst = find(compute.list_instances(comp_id).data, f"{PREFIX}-worker")
if not inst:
    for attempt in range(1, 4):
        try:
            print(f"launching {SHAPE} (attempt {attempt}) …")
            inst = compute.launch_instance(oci.core.models.LaunchInstanceDetails(
                compartment_id=comp_id, availability_domain=ad, display_name=f"{PREFIX}-worker",
                shape=SHAPE,
                create_vnic_details=oci.core.models.CreateVnicDetails(subnet_id=sn.id, assign_public_ip=True),
                source_details=oci.core.models.InstanceSourceViaImageDetails(image_id=img.id, boot_volume_size_in_gbs=50),
                metadata={"ssh_authorized_keys": pub_key})).data
            print("launch accepted"); break
        except oci.exceptions.ServiceError as e:
            print(f"  {e.status}: {e.message[:90]}")
            if attempt == 3: sys.exit(2)
            time.sleep(10)

inst = wait(lambda: compute.get_instance(inst.id))
ip = None
for _ in range(25):
    vn = compute.list_vnic_attachments(comp_id, instance_id=inst.id).data
    if vn and vn[0].vnic_id:
        ip = net.get_vnic(vn[0].vnic_id).data.public_ip
        if ip: break
    time.sleep(3)
print("INSTANCE_RUNNING")
print("PUBLIC_IP:", ip)
