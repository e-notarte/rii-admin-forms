const fs = require('fs');

try {
  let content = fs.readFileSync('supplies-dashboard.html', 'utf8');
  const oldScript = `function submitRequest() {
            var dept = document.getElementById('deptSelect').value;
            if (!dept) { alert('Please select a department.'); return; }

            var rows = document.querySelectorAll('#requestBody tr');
            if (rows.length === 0) { alert('Please add at least one item.'); return; }

            var items = [];
            var valid = true;
            rows.forEach(function (row) {
                var sel = row.querySelector('select');
                var qty = row.querySelector('input[type="number"]');
                var pur = row.querySelector('input[type="text"]');
                if (!sel || !sel.value || !qty || !qty.value) { valid = false; return; }
                items.push({ description: sel.value, qty: qty.value, purpose: pur ? pur.value : '' });
            });

            if (!valid) { alert('Please fill in all item descriptions and quantities.'); return; }

            var ref = generateRef();
            var payload = {
                reference: ref,
                department: dept,
                items: items,
                timestamp: new Date().toISOString()
            };

            console.log('Supply Request Submitted:', payload);



            document.getElementById('modalRef').textContent = ref;
            document.getElementById('successModal').classList.add('show');

            document.getElementById('requestBody').innerHTML = '';
            document.getElementById('deptSelect').value = '';
            rowCount = 0;
            addRequestRow();
        }`;
        
  const newScript = `async function submitRequest() {
            var dept = document.getElementById('deptSelect').value;
            if (!dept) { alert('Please select a department.'); return; }

            var rows = document.querySelectorAll('#requestBody tr');
            if (rows.length === 0) { alert('Please add at least one item.'); return; }

            var items = [];
            var valid = true;
            rows.forEach(function (row) {
                var sel = row.querySelector('select');
                var qty = row.querySelector('input[type="number"]');
                var pur = row.querySelector('input[type="text"]');
                if (!sel || !sel.value || !qty || !qty.value) { valid = false; return; }
                items.push({ description: sel.value, qty: parseInt(qty.value), purpose: pur ? pur.value : '' });
            });

            if (!valid) { alert('Please fill in all item descriptions and quantities.'); return; }

            var ref = generateRef();
            const btn = document.getElementById('submitBtn');
            const originalText = btn.textContent;
            btn.textContent = 'Submitting...';
            btn.disabled = true;

            try {
                // Import supabase dynamically since this is inside a regular script (not module initially)
                // Or we can just let it work assuming supabase is available globally or we change the script type.
                // Wait, supplies dashboard doesn't have type="module". We need to add the import.
                const { supabase } = await import('./supabase-client.js');

                // Insert request
                const { data: requestData, error: requestError } = await supabase
                    .from('supplies_requests')
                    .insert([{ department: dept, reference_number: ref }])
                    .select();

                if (requestError) throw requestError;

                const requestId = requestData[0].id;
                
                // Insert items
                const itemsToInsert = items.map(item => ({
                    request_id: requestId,
                    description: item.description,
                    quantity: item.qty,
                    purpose: item.purpose
                }));

                const { error: itemsError } = await supabase
                    .from('supplies_items')
                    .insert(itemsToInsert);
                
                if (itemsError) throw itemsError;

                document.getElementById('modalRef').textContent = ref;
                document.getElementById('successModal').classList.add('show');

                document.getElementById('requestBody').innerHTML = '';
                document.getElementById('deptSelect').value = '';
                rowCount = 0;
                addRequestRow();
            } catch (error) {
                alert('Error submitting request: ' + error.message);
                console.error(error);
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        }`;

    if (content.includes('function submitRequest() {')) {
        content = content.replace(oldScript, newScript);
        fs.writeFileSync('supplies-dashboard.html', content);
        console.log("Updated supplies-dashboard.html");
    } else {
        console.log("Could not find submitRequest in supplies-dashboard.html");
    }

} catch(e) {
  console.error("Error", e);
}
