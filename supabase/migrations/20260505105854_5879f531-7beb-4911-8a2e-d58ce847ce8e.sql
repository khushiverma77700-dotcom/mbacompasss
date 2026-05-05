UPDATE mega_menu_items SET link_url = '/coaching?category=cat' || SUBSTRING(link_url FROM 14) WHERE menu_type='coaching' AND link_url LIKE '/category/cat%';
UPDATE mega_menu_items SET link_url = '/coaching?category=gmat' || SUBSTRING(link_url FROM 15) WHERE menu_type='coaching' AND link_url LIKE '/category/gmat%';
UPDATE mega_menu_items SET link_url = '/coaching?category=xat-snap' || SUBSTRING(link_url FROM 19) WHERE menu_type='coaching' AND link_url LIKE '/category/xat-snap%';
UPDATE mega_menu_items SET link_url = '/coaching?category=mat-cmat' || SUBSTRING(link_url FROM 19) WHERE menu_type='coaching' AND link_url LIKE '/category/mat-cmat%';
UPDATE mega_menu_items SET link_url = '/coaching?category=gre-toefl' || SUBSTRING(link_url FROM 20) WHERE menu_type='coaching' AND link_url LIKE '/category/gre-toefl%';
UPDATE mega_menu_items SET link_url = '/coaching?category=interview' || SUBSTRING(link_url FROM 20) WHERE menu_type='coaching' AND link_url LIKE '/category/interview%';
-- Convert remaining ?city= and ?mode= to &city= / &mode=
UPDATE mega_menu_items SET link_url = REPLACE(link_url, '?category=cat?', '?category=cat&') WHERE menu_type='coaching';
UPDATE mega_menu_items SET link_url = REPLACE(link_url, '?category=gmat?', '?category=gmat&') WHERE menu_type='coaching';