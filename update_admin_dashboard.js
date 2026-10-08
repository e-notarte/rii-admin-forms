const fs = require('fs');

let content = fs.readFileSync('admin-dashboard.html', 'utf8');

// The new view for facility requests
const newFacilityView = `
            <!-- FACILITY RESERVATION APPROVAL VIEW -->
            <div id="view-calendar" class="view-section active">
                <div class="page-header">
                    <h1><i class="fa-solid fa-building-circle-check"></i> Facility Requests Approval</h1>
                </div>

                <div class="data-card">
                    <div class="toolbar">
                        <div class="search-box">
                            <i class="fa-solid fa-magnifying-glass"></i>
                            <input type="text" placeholder="Search requestor name...">
                        </div>
                        <div class="filter-pills">
                            <div class="pill active">Pending</div>
                            <div class="pill">Approved</div>
                            <div class="pill">Rejected</div>
                            <div class="pill">All</div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Request Details</th>
                                <th>Date & Time</th>
                                <th>Department</th>
                                <th>Participants</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="facilityRequestsTableBody">
                            <tr><td colspan="6" style="text-align: center;">Loading requests...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
`;

// Replace the calendar view
const viewCalendarRegex = /<!-- FACILITY RESERVATION CALENDAR VIEW -->[\s\S]*?(?=<\/div>\s*<\/main>)/;
content = content.replace(viewCalendarRegex, newFacilityView + '        </div>\n');

// Also update the script to load from supabase
const supabaseImportScript = `
    <script type="module">
        import { supabase } from './supabase-client.js';

        // Make switchView globally accessible since it's a module
        window.switchView = function(viewId, menuItem) {
            // Hide all views
            document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
            // Show target view
            document.getElementById(viewId).classList.add('active');

            // Update sidebar active states
            document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
            menuItem.classList.add('active');
        }

        async function loadFacilityRequests() {
            const tableBody = document.getElementById('facilityRequestsTableBody');
            
            try {
                const { data, error } = await supabase
                    .from('conference_requests')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                if (data.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No requests found.</td></tr>';
                    return;
                }

                tableBody.innerHTML = data.map(req => {
                    const statusClass = req.status === 'Pending' ? '' : (req.status === 'Approved' ? 'active' : 'rejected');
                    return \`
                        <tr>
                            <td class="user-cell">
                                <span class="user-name">\${req.title}</span>
                                <span class="user-email">\${req.requestor_name} (\${req.company})</span>
                            </td>
                            <td>
                                <div>\${req.request_date}</div>
                                <div style="font-size: 0.8rem; color: var(--text-muted);">\${req.start_time} - \${req.end_time}</div>
                            </td>
                            <td>\${req.department}</td>
                            <td>\${req.participants} pax</td>
                            <td><span class="status-badge \${statusClass}">\${req.status}</span></td>
                            <td>
                                \${req.status === 'Pending' ? \`
                                <button onclick="updateRequestStatus('\${req.id}', 'Approved')" style="padding: 4px 8px; font-size: 0.75rem; background: #10b981; color: white;">Approve</button>
                                <button onclick="updateRequestStatus('\${req.id}', 'Rejected')" style="padding: 4px 8px; font-size: 0.75rem; background: #ef4444; color: white; margin-left: 5px;">Reject</button>
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

        window.updateRequestStatus = async function(id, newStatus) {
            try {
                const { error } = await supabase
                    .from('conference_requests')
                    .update({ status: newStatus })
                    .eq('id', id);
                    
                if (error) throw error;
                loadFacilityRequests(); // reload table
            } catch (e) {
                alert('Error updating status: ' + e.message);
            }
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            loadFacilityRequests();
        });
    </script>
`;

// Replace the old calendar script logic
const scriptRegex = /<script>\s*\/\/\s*---\s*VIEW SWITCHER\s*---[\s\S]*?<\/script>/;
if (content.match(scriptRegex)) {
    content = content.replace(scriptRegex, supabaseImportScript);
} else {
    // just append it before closing body
    content = content.replace(/<\/body>/, supabaseImportScript + '\n</body>');
}

fs.writeFileSync('admin-dashboard.html', content);
console.log('Updated admin-dashboard.html successfully!');
