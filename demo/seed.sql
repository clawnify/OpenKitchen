-- Fictional kitchen records for the disposable template preview.
INSERT INTO suppliers (id, name, contact_name, email) VALUES
 ('4e38bd13-412b-501e-a4d9-17e6d283e9b0', 'Sample Pantry Supply', 'Sales desk', 'pantry@example.test'),
 ('f21b8dbb-4211-5418-aae2-20397a72e49c', 'Sample Produce Market', 'Jamie', 'produce@example.test');
INSERT INTO ingredients (id, name, unit, cost_cents, supplier_id, par_level, category, allergens) VALUES
 ('dc3eb445-7c15-5641-ad01-53d96b696f21', 'Flour', 'kg', 150, '4e38bd13-412b-501e-a4d9-17e6d283e9b0', 10, 'dry', 'gluten'),
 ('2e376556-74d4-5f91-8445-c6a67b5b0808', 'Olive oil', 'L', 1100, '4e38bd13-412b-501e-a4d9-17e6d283e9b0', 5, 'dry', NULL),
 ('9a5977d9-1615-512e-b9cb-2fc22858dfe5', 'Tomatoes', 'kg', 320, 'f21b8dbb-4211-5418-aae2-20397a72e49c', 12, 'produce', NULL),
 ('3700eb5f-a9cf-59af-969e-a062dd8d6e71', 'Sea salt', 'kg', 110, '4e38bd13-412b-501e-a4d9-17e6d283e9b0', 2, 'dry', NULL);
INSERT INTO recipes (id, name, kind, category, yield_qty, yield_unit, menu_price_cents, target_food_cost_pct) VALUES
 ('10fa5c5c-4e17-597a-910b-8141101f6d79', 'Tomato sauce', 'prep', 'sauce', 5, 'kg', NULL, NULL),
 ('8842fd17-8f3e-5b91-850d-7aede2f851d8', 'Tomato flatbread', 'dish', 'main', 10, 'portion', 850, 30);
INSERT INTO recipe_items (id, recipe_id, item_type, ingredient_id, sub_recipe_id, qty, unit) VALUES
 ('ebc2e841-608b-57b8-b9d8-64be4372af8f', '10fa5c5c-4e17-597a-910b-8141101f6d79', 'ingredient', '9a5977d9-1615-512e-b9cb-2fc22858dfe5', NULL, 5, 'kg'),
 ('c0ef0271-9bdc-5ad5-9e8c-b93857cf2a55', '10fa5c5c-4e17-597a-910b-8141101f6d79', 'ingredient', '2e376556-74d4-5f91-8445-c6a67b5b0808', NULL, 0.2, 'L'),
 ('7484d89c-3baa-5a39-bb7f-1fe57e9cff5f', '10fa5c5c-4e17-597a-910b-8141101f6d79', 'ingredient', '3700eb5f-a9cf-59af-969e-a062dd8d6e71', NULL, 0.05, 'kg'),
 ('e75aa2a6-f87e-5917-86f4-57b1c70e520f', '8842fd17-8f3e-5b91-850d-7aede2f851d8', 'ingredient', 'dc3eb445-7c15-5641-ad01-53d96b696f21', NULL, 2, 'kg'),
 ('73fea5d7-d659-5e2e-ac09-850e10ed0343', '8842fd17-8f3e-5b91-850d-7aede2f851d8', 'ingredient', '2e376556-74d4-5f91-8445-c6a67b5b0808', NULL, 0.1, 'L'),
 ('ca24c96e-ef42-523d-83da-98918c9140c5', '8842fd17-8f3e-5b91-850d-7aede2f851d8', 'recipe', NULL, '10fa5c5c-4e17-597a-910b-8141101f6d79', 1.5, 'kg');
INSERT INTO inventory_counts (id, ingredient_id, counted_qty, count_date, counted_by) VALUES
 ('8ed50244-22bd-5835-8848-806e2a6dae39', 'dc3eb445-7c15-5641-ad01-53d96b696f21', 8, date('now', '-1 day'), 'Kitchen'),
 ('6348d2b9-c855-5e1f-b215-562980ee9c2d', '2e376556-74d4-5f91-8445-c6a67b5b0808', 7, date('now', '-1 day'), 'Kitchen'),
 ('5dcb4c32-7b02-5e3b-9fd1-dddca394589a', '9a5977d9-1615-512e-b9cb-2fc22858dfe5', 15, date('now', '-1 day'), 'Kitchen'),
 ('b41802ea-6abc-54aa-9e88-7e0f2638250d', '3700eb5f-a9cf-59af-969e-a062dd8d6e71', 3, date('now', '-1 day'), 'Kitchen');
INSERT INTO production_runs (id, recipe_id, qty, run_date) VALUES
 ('3537b96a-a837-516a-b388-6325ca0500e9', '8842fd17-8f3e-5b91-850d-7aede2f851d8', 50, date('now', '-3 days')),
 ('401c8ff6-ef95-577f-b8ae-85ad8b4c734e', '8842fd17-8f3e-5b91-850d-7aede2f851d8', 70, date('now', '-1 day'));
INSERT INTO supplier_price_history (id, ingredient_id, supplier_id, unit_cost_cents, effective_date) VALUES
 ('b721cc69-d2f3-500d-ba2c-b92f3bff27cf', 'dc3eb445-7c15-5641-ad01-53d96b696f21', '4e38bd13-412b-501e-a4d9-17e6d283e9b0', 130, date('now', '-35 days')),
 ('31fafa13-80b1-5240-9830-1dd53ff75ad7', 'dc3eb445-7c15-5641-ad01-53d96b696f21', '4e38bd13-412b-501e-a4d9-17e6d283e9b0', 150, date('now', '-2 days'));
INSERT INTO invoices (id, supplier_id, invoice_number, invoice_date, total_cents, status, source) VALUES
 ('03233700-9595-583f-8a44-039f61d3fcad', '4e38bd13-412b-501e-a4d9-17e6d283e9b0', 'SAMPLE-1001', date('now', '-2 days'), 1600, 'pending', 'manual');
INSERT INTO invoice_lines (id, invoice_id, ingredient_id, description, qty, unit, unit_cost_cents, line_total_cents) VALUES
 ('dac360fa-0846-5d0f-a908-52d5b77a9136', '03233700-9595-583f-8a44-039f61d3fcad', 'dc3eb445-7c15-5641-ad01-53d96b696f21', 'Flour, 10 kg', 10, 'kg', 160, 1600);
INSERT INTO documents (id, kind, name, issuer, reference, issued_date, expiry_date, status, notes) VALUES
 ('ed623346-7740-574f-9c8a-ac8e98df21a7', 'insurance', 'Sample kitchen insurance', 'Example insurer', 'DEMO-1001', date('now', '-335 days'), date('now', '+30 days'), 'expiring', 'Fictional demonstration record.');
