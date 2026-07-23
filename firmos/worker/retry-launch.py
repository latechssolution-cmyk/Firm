#!/usr/bin/env python3
"""Patient launcher: retries E2.1.Micro (AMD Always-Free) with long backoff to
clear 429 throttling, then falls back to ARM A1.Flex if micro capacity is out.
Writes the public IP to worker/vm-ip.txt on success."""
import os, time, oci

cfg = oci.config.from_file("~/.oci/config", "DEFAULT")
tenancy = cfg["tenancy"]; comp_id = tenancy
net = oci.core.VirtualNetworkClient(cfg); compute = oci.core.ComputeClient(cfg)
ident = oci.identity.IdentityClient(cfg)
PREFIX = "firmos"
ad = ident.list_availability_domains(tenancy).data[0].name
pub_key = open(os.path.expanduser("~/.ssh/firmos_oci.pub")).read().strip()

def find(items, name):
    for i in items:
        if i.display_name == name and getattr(i, "lifecycle_state", "AVAILABLE") not in ("TERMINATED","TERMINATING"):
            return i
    return None

vcn = find(net.list_vcns(comp_id).data, f"{PREFIX}-vcn")
sn = find(net.list_subnets(comp_id, vcn_id=vcn.id).data, f"{PREFIX}-subnet")

def img_for(shape):
    return next(i for i in compute.list_images(comp_id, operating_system="Canonical Ubuntu",
                shape=shape, sort_by="TIMECREATED", sort_order="DESC").data if "24.04" in i.display_name)

def try_launch(shape, ocpus=None, gb=None):
    kw = {}
    if ocpus:
        kw["shape_config"] = oci.core.models.LaunchInstanceShapeConfigDetails(ocpus=ocpus, memory_in_gbs=gb)
    return compute.launch_instance(oci.core.models.LaunchInstanceDetails(
        compartment_id=comp_id, availability_domain=ad, display_name=f"{PREFIX}-worker", shape=shape,
        create_vnic_details=oci.core.models.CreateVnicDetails(subnet_id=sn.id, assign_public_ip=True),
        source_details=oci.core.models.InstanceSourceViaImageDetails(image_id=img_for(shape).id, boot_volume_size_in_gbs=50),
        metadata={"ssh_authorized_keys": pub_key}, **kw)).data

PLAN = [("VM.Standard.E2.1.Micro", None, None)] * 8 + [("VM.Standard.A1.Flex", 1, 6)] * 8
inst = find(compute.list_instances(comp_id).data, f"{PREFIX}-worker")
if not inst:
    for i, (shape, o, g) in enumerate(PLAN):
        try:
            print(f"[{i}] launching {shape} …", flush=True)
            inst = try_launch(shape, o, g); print("  accepted", flush=True); break
        except oci.exceptions.ServiceError as e:
            print(f"  {e.status}: {str(e.message)[:70]}", flush=True)
            time.sleep(90)  # long backoff clears 429 and lets capacity churn
    if not inst:
        print("EXHAUSTED"); raise SystemExit(2)

for _ in range(80):
    s = compute.get_instance(inst.id).data
    if s.lifecycle_state == "RUNNING": break
    if s.lifecycle_state in ("FAILED","TERMINATED"): print("STATE", s.lifecycle_state); raise SystemExit(3)
    time.sleep(5)

ip = None
for _ in range(25):
    vn = compute.list_vnic_attachments(comp_id, instance_id=inst.id).data
    if vn and vn[0].vnic_id:
        ip = net.get_vnic(vn[0].vnic_id).data.public_ip
        if ip: break
    time.sleep(4)
open(os.path.join(os.path.dirname(__file__), "vm-ip.txt"), "w").write(ip or "")
print("PUBLIC_IP:", ip)
print("SHAPE:", compute.get_instance(inst.id).data.shape)
