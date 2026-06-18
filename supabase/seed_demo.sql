-- ============================================================
-- DEMO SEED — realistic incident history for the AI assistant demo
-- Paste into the Supabase SQL Editor and run. Safe to run once.
-- Re-running is a no-op (guarded on the demo data already existing),
-- so it will not create duplicates.
--
-- Patterns baked in so the assistant has something to find:
--   • Spill is the most common incident type
--   • "Driver" is the dominant root cause behind preventable incidents
--   • Mike Thompson is the highest-risk driver (repeat preventable spills)
--   • Recent incidents are still open / in review; older ones are closed
-- To remove later: delete incidents for the demo drivers below, then
-- delete the demo drivers and customers.
-- ============================================================

-- 1) Demo drivers (only inserted if missing)
insert into drivers (full_name)
select n from (values
  ('Mike Thompson'), ('Dale Robertson'), ('Sandra Klassen'),
  ('Jerry Friesen'), ('Curtis Penner'), ('Wade Sinclair')
) as v(n)
where not exists (select 1 from drivers d where d.full_name = v.n);

-- 2) Demo customers (only inserted if missing)
insert into customers (name, province)
select n, p from (values
  ('Prairie Co-op Fuels', 'MB'), ('Northland Trucking', 'MB'),
  ('Brandon Bulk Petroleum', 'MB'), ('Selkirk Farm Supply', 'MB'),
  ('Thompson General Store', 'MB'), ('Portage Grain & Fuel', 'MB')
) as v(n, p)
where not exists (select 1 from customers c where c.name = v.n);

-- 3) Demo incidents — resolves all foreign keys by label/name via joins.
insert into incidents (
  date, incident_type_id, root_cause_id, reported_to_id, dispatcher_id,
  driver_id, customer_id, preventable, status, description, corrective_action,
  product_type, spill_volume_litres, spill_location, reported_to_authority, authority_name
)
select
  v.d::date, t.id, rc.id, rt.id, dp.id, dr.id, cu.id,
  v.preventable, v.status, v.description, v.corrective_action,
  v.product_type, v.spill_volume_litres::numeric, v.spill_location,
  v.reported_to_authority, v.authority_name
from (values
  ('2025-07-05','Loading Error','Dispatch','Dave','Dave','Dale Robertson','Prairie Co-op Fuels',false,'closed','Wrong product staged for the load, caught at the rack before departure.','Re-verified bill of lading against the load ticket before fill.',null,null,null,null,null),
  ('2025-07-19','Runout','Customer','Rob','Dori','Sandra Klassen','Selkirk Farm Supply',false,'closed','Customer tank ran dry before scheduled top up; keep-fill data was stale.','Customer moved to monitored keep-fill schedule.',null,null,null,null,null),
  ('2025-08-02','Spill','Driver','Dori','Dori','Mike Thompson','Northland Trucking',true,'closed','Hose uncoupled under pressure during transfer, diesel onto gravel pad.','Driver retrained on transfer shutdown sequence; spill kit deployed.','Diesel',180,'Customer yard, gravel pad',true,'MB Environment'),
  ('2025-08-21','Mix','Driver','Gary','Dave','Mike Thompson','Brandon Bulk Petroleum',true,'closed','Dyed and clear diesel cross dropped into the wrong compartment.','Compartment relabeled; driver coached on drop verification.',null,null,null,null,null),
  ('2025-09-03','Spill','Driver','Dori','Sarleen','Curtis Penner','Portage Grain & Fuel',true,'closed','Overfill at farm tank, roughly 60 litres of gasoline to ground.','Driver coached on watching the sight gauge; absorbent applied.','Gasoline',60,'Farm tank stand',false,null),
  ('2025-09-17','Accident','Driver','Barry','Dave','Mike Thompson','Thompson General Store',true,'closed','Backed into a bollard at the store lot, minor tank guard damage.','Unit inspected; driver completed backing refresher.',null,null,null,null,null),
  ('2025-09-29','Loading Error','Dispatch','Dave','Dave','Jerry Friesen','Prairie Co-op Fuels',false,'closed','Dispatch assigned wrong terminal, driver routed to correct rack.','Dispatch updated the terminal assignment in the run sheet.',null,null,null,null,null),
  ('2025-10-10','Runout','Dispatch','Rob','Dori','Dale Robertson','Selkirk Farm Supply',true,'closed','Delivery missed its window, customer ran out overnight.','Added a buffer day to the winter delivery schedule.',null,null,null,null,null),
  ('2025-10-24','Spill','Driver','Dori','Dori','Mike Thompson','Northland Trucking',true,'closed','Drove off with the bottom valve cracked, diesel trail across the lot.','Pre-departure valve check added; driver written up.','Diesel',240,'Customer yard and approach',true,'MB Environment'),
  ('2025-11-05','Retain','Customer','Gary','Sarleen','Sandra Klassen','Brandon Bulk Petroleum',false,'closed','Customer refused partial load over a quality concern, product retained.','Sample pulled and cleared; redelivered next day.',null,null,null,null,null),
  ('2025-11-18','Mix','Dispatch','Dave','Dave','Curtis Penner','Portage Grain & Fuel',false,'closed','Order entered with the wrong grade, corrected before the drop.','Order entry double check added at dispatch.',null,null,null,null,null),
  ('2025-12-01','Spill','Driver','Dori','Dori','Wade Sinclair','Thompson General Store',true,'closed','Nozzle pulled out early at the fill point, heating oil splash.','Driver coached on nozzle seating; area cleaned.','Heating Oil',95,'Store fill point',false,null),
  ('2025-12-15','Runout','Customer','Rob','Dori','Jerry Friesen','Selkirk Farm Supply',false,'closed','Customer usage spiked in a cold snap, tank emptied early.','Customer advised to call in for an interim fill.',null,null,null,null,null),
  ('2026-01-09','Accident','Driver','Barry','Dave','Mike Thompson','Brandon Bulk Petroleum',true,'closed','Slid into a curb on an unsanded approach, no injuries.','Driver coached on winter approach speeds.',null,null,null,null,null),
  ('2026-01-23','Redirect','Dispatch','Saurleen','Sarleen','Dale Robertson','Prairie Co-op Fuels',false,'closed','Load redirected mid route to cover an urgent customer.','Documented the redirect and adjusted the day sheet.',null,null,null,null,null),
  ('2026-02-04','Spill','Driver','Dori','Dori','Mike Thompson','Northland Trucking',true,'closed','Transfer left unattended, tank overflowed, largest spill of the quarter.','Driver suspended pending retraining; full remediation completed.','Diesel',300,'Customer bulk plant',true,'MB Environment'),
  ('2026-02-18','Loading Error','Driver','Dave','Dave','Curtis Penner','Portage Grain & Fuel',true,'closed','Loaded against the wrong ticket, short on the delivery.','Driver coached to confirm ticket number at the rack.',null,null,null,null,null),
  ('2026-03-02','Runout','Dispatch','Rob','Dori','Sandra Klassen','Selkirk Farm Supply',true,'in_review','Route sequenced poorly, customer ran out before arrival.','Reviewing route sequencing for the south loop.',null,null,null,null,null),
  ('2026-03-16','Spill','Customer','Dori','Sarleen','Wade Sinclair','Brandon Bulk Petroleum',false,'closed','Customer tank vent was blocked, minor propane release on connect.','Customer advised to clear the vent before next fill.','Propane',25,'Customer tank',false,null),
  ('2026-03-28','Mix','Driver','Gary','Dave','Mike Thompson','Thompson General Store',true,'in_review','Cross drop suspected between two grades, samples pulled.','Awaiting lab results; driver off bulk drops meanwhile.',null,null,null,null,null),
  ('2026-04-08','Retain','Customer','Gary','Dori','Jerry Friesen','Selkirk Farm Supply',false,'closed','Customer site inaccessible, product retained and returned.','Rescheduled once the site was plowed.',null,null,null,null,null),
  ('2026-04-21','Spill','Driver','Dori','Dori','Mike Thompson','Northland Trucking',true,'in_review','Coupling gasket failed on an old fitting, diesel to ground.','Replacing fittings fleet wide; incident under review.','Diesel',150,'Customer yard',true,'MB Environment'),
  ('2026-05-02','Loading Error','Dispatch','Dave','Dave','Dale Robertson','Prairie Co-op Fuels',false,'in_review','Two orders swapped at dispatch, delivered to wrong stop first.','Reviewing the dispatch handoff process.',null,null,null,null,null),
  ('2026-05-12','Accident','Driver','Barry','Sarleen','Curtis Penner','Portage Grain & Fuel',true,'in_review','Clipped a low gate entering the yard, mirror damage.','Driver coached on yard clearances.',null,null,null,null,null),
  ('2026-05-20','Runout','Customer','Rob','Dori','Sandra Klassen','Selkirk Farm Supply',false,'open','Customer forgot to call in, ran out before the next route.','Following up to set up keep-fill.',null,null,null,null,null),
  ('2026-05-27','Spill','Driver','Dori','Dori','Wade Sinclair','Thompson General Store',true,'open','Hose left in the fill while moving the truck, gasoline spray.','Pending driver coaching on hose stow before moves.','Gasoline',110,'Store lot',false,null),
  ('2026-06-02','Redirect','Dispatch','Saurleen','Dave','Jerry Friesen','Prairie Co-op Fuels',false,'open','Load redirected for an emergency furnace out call.','Logged the redirect; original stop rebooked.',null,null,null,null,null),
  ('2026-06-06','Spill','Driver','Dori','Dori','Mike Thompson','Brandon Bulk Petroleum',true,'open','Overfill at the bulk plant, diesel over the containment lip.','Open: driver retraining and containment review scheduled.','Diesel',200,'Bulk plant containment',true,'MB Environment'),
  ('2026-06-10','Loading Error','Driver','Dave','Dave','Curtis Penner','Portage Grain & Fuel',true,'open','Wrong compartment opened at the rack, small clear diesel loss.','Open: reviewing compartment labeling.',null,null,null,null,null),
  ('2026-06-12','Mix','Dispatch','Gary','Sarleen','Dale Robertson','Northland Trucking',false,'open','Grade mislabeled on the order, caught at delivery.','Open: order entry being reviewed.',null,null,null,null,null),
  ('2026-06-14','Runout','Customer','Rob','Dori','Sandra Klassen','Selkirk Farm Supply',false,'open','Customer usage underestimated, tank near empty on arrival.','Open: adjusting the usage estimate.',null,null,null,null,null),
  ('2026-06-15','Spill','Driver','Dori','Dori','Mike Thompson','Thompson General Store',true,'open','Slow drip from a worn nozzle during a fill, dyed diesel.','Open: nozzle flagged for replacement; driver coaching pending.','Dyed Diesel',75,'Store fill point',false,null)
) as v(d, type_label, rc_label, rt_label, dp_label, driver_name, customer_name,
       preventable, status, description, corrective_action,
       product_type, spill_volume_litres, spill_location, reported_to_authority, authority_name)
left join lookup_options t  on t.category = 'incident_type' and t.label = v.type_label
left join lookup_options rc on rc.category = 'root_cause'   and rc.label = v.rc_label
left join lookup_options rt on rt.category = 'reported_to'  and rt.label = v.rt_label
left join lookup_options dp on dp.category = 'dispatcher'   and dp.label = v.dp_label
left join drivers dr        on dr.full_name = v.driver_name
left join customers cu      on cu.name = v.customer_name
where not exists (
  -- guard: skip entirely if demo data is already loaded
  select 1 from incidents i
  join drivers d on d.id = i.driver_id
  where d.full_name = 'Mike Thompson'
);
