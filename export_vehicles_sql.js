const fs = require('fs');
const data = JSON.parse(fs.readFileSync('admin-forms/company_vehicles.json', 'utf8'));

let sql = `-- ====================================================================
-- R-II BUILDERS, INC. - COMPANY VEHICLES MASTER FLEET REGISTRY SCHEMA
-- Auto-generated from VEHICLE LIST.xlsx (135 Company Fleet Records)
-- ====================================================================

create table if not exists public.company_vehicles (
  id text primary key,
  asset_code text not null,
  accountability_code text,
  accountability_status text default 'NOT APPLICABLE',
  brand_make text not null,
  plate_no text not null,
  model_description text not null,
  assignee_name text default 'Unassigned',
  position_title text default '-',
  division text default 'OPERATIONS',
  department_project text default '-',
  year_model text,
  vehicle_status text not null default 'OPERATIONAL',
  registered_owner text default 'RII BUILDERS, INC.',
  renewal_month text default 'N/A',
  cr_or_no text,
  original_cr text default 'NO',
  date_acquired text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_vehicles_plate_idx on public.company_vehicles(plate_no);
create index if not exists company_vehicles_status_idx on public.company_vehicles(vehicle_status);
create index if not exists company_vehicles_brand_idx on public.company_vehicles(brand_make);
create index if not exists company_vehicles_dept_idx on public.company_vehicles(department_project);

alter table public.company_vehicles enable row level security;

drop policy if exists "Allow all for company_vehicles" on public.company_vehicles;
create policy "Allow all for company_vehicles"
  on public.company_vehicles
  for all
  using (true)
  with check (true);

-- Upsert 135 Vehicles from VEHICLE LIST.xlsx
insert into public.company_vehicles (id, asset_code, accountability_code, accountability_status, brand_make, plate_no, model_description, assignee_name, position_title, division, department_project, year_model, vehicle_status, registered_owner, renewal_month, cr_or_no, original_cr, date_acquired) values
`;

const escapeSql = str => String(str || '').replace(/'/g, "''");

const rows = data.map(v => {
  return `  ('${escapeSql(v.id)}', '${escapeSql(v.asset_code)}', '${escapeSql(v.accountability_code)}', '${escapeSql(v.accountability_status)}', '${escapeSql(v.brand_make)}', '${escapeSql(v.plate_no)}', '${escapeSql(v.model_description)}', '${escapeSql(v.assignee_name)}', '${escapeSql(v.position_title)}', '${escapeSql(v.division)}', '${escapeSql(v.department_project)}', '${escapeSql(v.year_model)}', '${escapeSql(v.vehicle_status)}', '${escapeSql(v.registered_owner)}', '${escapeSql(v.renewal_month)}', '${escapeSql(v.cr_or_no)}', '${escapeSql(v.original_cr)}', '${escapeSql(v.date_acquired)}')`;
}).join(',\n');

sql += rows + `
on conflict (id) do update set
  asset_code = excluded.asset_code,
  accountability_code = excluded.accountability_code,
  accountability_status = excluded.accountability_status,
  brand_make = excluded.brand_make,
  plate_no = excluded.plate_no,
  model_description = excluded.model_description,
  assignee_name = excluded.assignee_name,
  position_title = excluded.position_title,
  division = excluded.division,
  department_project = excluded.department_project,
  year_model = excluded.year_model,
  vehicle_status = excluded.vehicle_status,
  registered_owner = excluded.registered_owner,
  renewal_month = excluded.renewal_month,
  cr_or_no = excluded.cr_or_no,
  original_cr = excluded.original_cr,
  date_acquired = excluded.date_acquired,
  updated_at = now();
`;

fs.writeFileSync('supabase_company_vehicles_schema.sql', sql);
console.log('Successfully written supabase_company_vehicles_schema.sql with ' + data.length + ' records');
