const fs = require('fs');

let content = fs.readFileSync('admin-dashboard.html', 'utf8');

const newLoadFunction = `        async function loadFacilityRequests() {
            const tableBody = document.getElementById('facilityRequestsTableBody');
            
            try {
                // Fetch from all 5 facility tables
                const queries = [
                    supabase.from('conference_requests').select('*').then(res => ({ ...res, type: 'Conference Room', table: 'conference_requests' })),
                    supabase.from('function_requests').select('*').then(res => ({ ...res, type: 'Function Hall', table: 'function_requests' })),
                    supabase.from('parking_requests').select('*').then(res => ({ ...res, type: 'Parking Slot', table: 'parking_requests' })),
                    supabase.from('zoom_requests').select('*').then(res => ({ ...res, type: 'Zoom Meeting', table: 'zoom_requests' })),
                    supabase.from('teams_requests').select('*').then(res => ({ ...res, type: 'MS Teams', table: 'teams_requests' }))
                ];

                const results = await Promise.all(queries);
                
                // Combine and normalize data
                let allRequests = [];
                results.forEach(res => {
                    if (res.error) {
                        console.error('Error fetching ' + res.table, res.error);
                        return; // skip on error
                    }
                    const items = res.data.map(item => {
                        let titleText = item.title;
                        let timeText = \`\${item.start_time || ''} - \${item.end_time || ''}\`;
                        let paxText = item.participants ? \`\${item.participants} pax\` : '-';
                        
                        if (res.table === 'parking_requests') {
                            titleText = \`Visitor: \${item.visitor} (\${item.plate})\`;
                            timeText = item.request_time;
                            paxText = item.visit ? item.visit : '-';
                        }
                        
                        return {
                            ...item,
                            display_title: titleText,
                            display_time: timeText,
                            display_pax: paxText,
                            request_type: res.type,
                            source_table: res.table
                        };
                    });
                    allRequests = allRequests.concat(items);
                });

                // Sort by created_at descending
                allRequests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

                if (allRequests.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No requests found.</td></tr>';
                    return;
                }

                tableBody.innerHTML = allRequests.map(req => {
                    const statusClass = req.status === 'Pending' ? '' : (req.status === 'Approved' ? 'active' : 'rejected');
                    return \`
                        <tr>
                            <td class="user-cell">
                                <span class="user-name">\${req.display_title || req.request_type}</span>
                                <span class="user-email">\${req.requestor_name} (\${req.company})</span>
                                <span style="font-size: 0.75rem; color: var(--primary); font-weight: 600; margin-top: 4px;">\${req.request_type}</span>
                            </td>
                            <td>
                                <div>\${req.request_date}</div>
                                <div style="font-size: 0.8rem; color: var(--text-muted);">\${req.display_time}</div>
                            </td>
                            <td>\${req.department}</td>
                            <td>\${req.display_pax}</td>
                            <td><span class="status-badge \${statusClass}">\${req.status}</span></td>
                            <td>
                                \${req.status === 'Pending' ? \`
                                <button onclick="updateRequestStatus('\${req.id}', '\${req.source_table}', 'Approved')" style="padding: 4px 8px; font-size: 0.75rem; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer;">Approve</button>
                                <button onclick="updateRequestStatus('\${req.id}', '\${req.source_table}', 'Rejected')" style="padding: 4px 8px; font-size: 0.75rem; background: #ef4444; color: white; margin-left: 5px; border: none; border-radius: 4px; cursor: pointer;">Reject</button>
                                \` : '-'}
                            </td>
                        </tr>
                    \`;
                }).join('');
            } catch(e) {
                console.error(e);
                tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Error loading requests.</td></tr>';
            }
        }

        window.updateRequestStatus = async function(id, table, newStatus) {
            try {
                const { error } = await supabase
                    .from(table)
                    .update({ status: newStatus })
                    .eq('id', id);
                    
                if (error) throw error;
                loadFacilityRequests(); // reload table
            } catch (e) {
                alert('Error updating status: ' + e.message);
            }
        }`;

// We will replace the existing loadFacilityRequests and updateRequestStatus functions
const replaceRegex = /async function loadFacilityRequests\(\) {[\s\S]*?window\.updateRequestStatus = async function\(id, newStatus\) {[\s\S]*?}\n/m;
const match = content.match(/async function loadFacilityRequests\(\) {[\s\S]*?window\.updateRequestStatus = async function\(id(?:,\s*newStatus)?\) {[\s\S]*?}/m);
if (match) {
    content = content.replace(match[0], newLoadFunction);
    fs.writeFileSync('admin-dashboard.html', content);
    console.log("Updated admin-dashboard.html!");
} else {
    // If exact regex fails, try another approach
    const start = content.indexOf('async function loadFacilityRequests() {');
    const end = content.indexOf('// Initialize');
    if(start !== -1 && end !== -1) {
        content = content.substring(0, start) + newLoadFunction + "\n\n        " + content.substring(end);
        fs.writeFileSync('admin-dashboard.html', content);
        console.log("Updated admin-dashboard.html (fallback)!");
    } else {
        console.log("Could not find functions to replace.");
    }
}
