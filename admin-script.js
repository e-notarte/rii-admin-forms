

  
    import { supabase } from './supabase-client.js';

    // Make switchView globally accessible since it's a module
    window.switchView = function (viewId, menuItem) {
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
            let timeText = `${item.start_time || ''} - ${item.end_time || ''}`;
            let paxText = item.participants ? `${item.participants} pax` : '-';

            if (res.table === 'parking_requests') {
              titleText = `Visitor: ${item.visitor} (${item.plate})`;
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
          allRequests = allRequests.concat(items); window._allRequests = allRequests;
        });

        // Sort by created_at descending
        allRequests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        window._currentFacilityFilter = window._currentFacilityFilter || 'Pending';
        window.renderFacilityTable();
        window.renderAdminCal();
      } catch (e) {
        console.error(e);
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Error loading requests.</td></tr>';
      }
    }

    window.updateRequestStatus = async function (id, table, newStatus) {
      try {
        // Find user id
        let targetUserId = null;
        if (typeof window._allRequests !== "undefined") {
          const req = window._allRequests.find(r => r.id === id);
          if (req && req.user_id) targetUserId = req.user_id;
        }
        const { error } = await supabase
          .from(table)
          .update({ status: newStatus })
          .eq('id', id);

        if (error) throw error;

        if (targetUserId) {
          try {
            const request = typeof window._allRequests !== "undefined"
              ? window._allRequests.find(req => req.id === id)
              : null;
            const requestDetails = request ? [
              `Request Type: ${request.request_type || table.replace('_requests', '')}`,
              `Requestor: ${request.requestor_name || 'Not specified'}`,
              `Date: ${request.request_date || 'Not specified'}`,
              `Time: ${request.display_time || 'Not specified'}`,
              `Destination / Resource: ${request.display_title || request.destination || 'Not specified'}`,
              `Department: ${request.department || 'Not specified'}`,
              `Status: ${newStatus}`
            ].join('\n') : `Your request has been ${newStatus.toLowerCase()} by the administrator.`;
            await supabase.from('notifications').insert([{
              user_id: targetUserId,
              title: `Request ${newStatus}`,
              message: requestDetails,
              request_type: table.replace('_requests', '').toUpperCase(),
              is_read: false
            }]);
          } catch (err) { console.error('Notification error', err); }
        }
        loadFacilityRequests(); // reload table
      } catch (e) {
        alert('Error updating status: ' + e.message);
      }
    }    window.renderFacilityTable = function () {
      const tableBody = document.getElementById('facilityRequestsTableBody');
      if (!tableBody || !window._allRequests) return;

      let filtered = window._allRequests;
      if (window._currentFacilityFilter !== 'All') {
        filtered = window._allRequests.filter(req => req.status === window._currentFacilityFilter);
      }

      if (filtered.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No requests found.</td></tr>';
        return;
      }

      tableBody.innerHTML = filtered.map(req => {
        const statusClass = req.status === 'Pending' ? '' : (req.status === 'Approved' ? 'active' : 'rejected');
        return
        <tr>
          <td class="user-cell">
            <span class="user-name"> + (req.display_title || req.request_type) + </span>
            <span class="user-email"> + req.requestor_name +  ( + req.company + )</span>
            <span style="font-size: 0.75rem; color: var(--primary); font-weight: 600; margin-top: 4px;"> + req.request_type + </span>
          </td>
          <td>
            <div> + req.request_date + </div>
            <div style="font-size: 0.8rem; color: var(--text-muted);"> + req.display_time + </div>
          </td>
          <td> + req.department + </td>
          <td> + req.display_pax + </td>
          <td><span class="status-badge  + statusClass + "> + req.status + </span></td>
          <td>
            + (req.status === 'Pending' ?
            <button onclick="updateRequestStatus(' + req.id + ', ' + req.source_table + ', 'Approved')" style="padding: 4px 8px; font-size: 0.75rem; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer;">Approve</button>
            <button onclick="updateRequestStatus(' + req.id + ', ' + req.source_table + ', 'Rejected')" style="padding: 4px 8px; font-size: 0.75rem; background: #ef4444; color: white; margin-left: 5px; border: none; border-radius: 4px; cursor: pointer;">Reject</button>
            : '-') +
          </td>
        </tr>
          ;
      }).join('');
    };

    window.filterFacilityRequests = function (filter, element) {
      window._currentFacilityFilter = filter;
      document.querySelectorAll('#facilityFilterPills .pill').forEach(p => p.classList.remove('active'));
      if (element) element.classList.add('active');
      window.renderFacilityTable();
    };

    window.renderAdminCal = function (year, month) {
      const calendarGrid = document.getElementById('calendarGrid');
      if (!calendarGrid) return;

      const today = new Date();
      if (month === undefined) month = parseInt(document.getElementById('calMonth').value) || today.getMonth();
      if (year === undefined) year = parseInt(document.getElementById('calYear').value) || today.getFullYear();

      calendarGrid.innerHTML = 
            <div class="calendar-day-header">Sun</div>
            <div class="calendar-day-header">Mon</div>
            <div class="calendar-day-header">Tue</div>
            <div class="calendar-day-header">Wed</div>
            <div class="calendar-day-header">Thu</div>
            <div class="calendar-day-header">Fri</div>
            <div class="calendar-day-header">Sat</div>
        ;

      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let i = 0; i < firstDay; i++) {
        calendarGrid.innerHTML += <div class="calendar-day empty"></div>;
      }

      const approvedEvents = (window._allRequests || []).filter(req => req.status === 'Approved');

      for (let i = 1; i <= daysInMonth; i++) {
        const mStr = String(month + 1).padStart(2, '0');
        const dStr = String(i).padStart(2, '0');
        const dateString = year + "-" + mStr + "-" + dStr;

        const dayEvents = approvedEvents.filter(e => e.request_date === dateString);
        const hasEvent = dayEvents.length > 0;

        let classStr = hasEvent ? "calendar-day reserved" : "calendar-day";
        let labelStr = hasEvent ? <br><span style="font-size:0.75rem; color:white; margin-top:auto;">Occupied</span> : "";

          let clickHandler = hasEvent ? onclick="showAdminDayDetails(' + dateString + ')" : "";
          if (hasEvent) {
            classStr += " clickable";
          calendarGrid.innerHTML += <div class=" + classStr + " style="cursor: pointer;"  + clickHandler + > + i + labelStr + </div>;
      } else {
        calendarGrid.innerHTML += <div class=" + classStr + "> + i + labelStr + </div>;
      }
    }
    };

    window.updateAdminCal = function () {
      renderAdminCal();
    };

    window.showAdminDayDetails = function (dateStr) {
      const dayEvents = (window._allRequests || []).filter(e => e.status === 'Approved' && e.request_date === dateStr);
      if (dayEvents.length === 0) return;

      let html = <h3 style="margin-top:0; color:var(--primary); font-size:1.1rem; border-bottom:1px solid #e2e8f0; padding-bottom:10px; margin-bottom:15px;">Reservations for  + dateStr + </h3><ul style="text-align:left; padding-left:20px; list-style-type:none; margin:0; padding:0;">;
        dayEvents.forEach(e => {
            const start = e.start_time ? e.start_time.substring(0, 5) : '';
            const end = e.end_time ? e.end_time.substring(0, 5) : '';
            const title = e.display_title || e.request_type;
            html += <li style="margin-bottom:12px; background:#f8fafc; padding:12px; border-radius:6px; border-left:4px solid var(--accent);">
                    <div style="font-size:0.85rem; color:#64748b; font-weight:600; margin-bottom:4px;"><i class="fa-regular fa-clock"></i>  + start +  -  + end +  ( + e.request_type + )</div>
                    <div style="color:var(--primary); font-weight:600;"> + title + </div>
                </li>;
        });
        html += '</ul>';

      let popup = document.getElementById('dayDetailsPopup');
      if (!popup) {
        popup = document.createElement('div');
        popup.id = 'dayDetailsPopup';
        popup.style.position = 'fixed';
        popup.style.top = '50%';
        popup.style.left = '50%';
        popup.style.transform = 'translate(-50%, -50%)';
        popup.style.background = '#fff';
        popup.style.padding = '24px';
        popup.style.borderRadius = '12px';
        popup.style.boxShadow = '0 10px 40px rgba(0,0,0,0.2)';
        popup.style.zIndex = '10001';
        popup.style.minWidth = '320px';
        popup.style.maxWidth = '90vw';
        popup.style.color = '#334155';

        const overlay = document.createElement('div');
        overlay.id = 'dayDetailsOverlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.background = 'rgba(15,23,42,0.6)';
        overlay.style.zIndex = '10000';
        overlay.onclick = () => { popup.style.display = 'none'; overlay.style.display = 'none'; };

        document.body.appendChild(overlay);
        document.body.appendChild(popup);
      }

      const overlay = document.getElementById('dayDetailsOverlay');
      popup.innerHTML = html + <button onclick="document.getElementById('dayDetailsPopup').style.display='none'; document.getElementById('dayDetailsOverlay').style.display='none';" style="margin-top:20px; width:100%; padding:10px 16px; background:var(--primary); color:white; font-weight:600; font-family:'Poppins',sans-serif; border:none; border-radius:6px; cursor:pointer; transition: opacity 0.2s;">Close</button>;

      popup.style.display = 'block';
      overlay.style.display = 'block';
    };

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
      loadFacilityRequests();
    });
  

  <footer class="footer"><span>? 2026 RII Builders, Inc. All Rights Reserved.</span><span>developed by admin</span>
  </footer>

  <!-- AI Bot Wrapper -->
  <div class="ai-bot-wrapper" id="aiBotWrapper">
    <div class="ai-chat-window" id="aiChatWindow">
      <div class="ai-chat-header">
        <img src="AI_Bot.png" alt="Mae">
        <span>Mae</span>
      </div>
      <div class="ai-chat-body">
        <p><strong>Mae:</strong> Hello! How can I help you today?</p>
      </div>
      <div class="ai-chat-footer">
        <input type="text" placeholder="Type message...">
        <button>Send</button>
      </div>
    </div>
    <div class="ai-bot-container" id="aiBotToggle" title="Chat">
      <div class="ai-bot-cloud">Chat</div>
      <div class="ai-bot-btn">
        <img src="AI_Bot.png" alt="AI Bot">
      </div>
    </div>
  </div>

  
    const aiBotToggle = document.getElementById('aiBotToggle');
    const aiBotWrapper = document.getElementById('aiBotWrapper');
    const aiChatWindow = document.getElementById('aiChatWindow');

    if (aiBotToggle && aiBotWrapper) {
      aiBotToggle.addEventListener('click', function (e) {
        if (!aiBotWrapper.classList.contains('active')) {
          aiBotWrapper.classList.add('active');
        } else {
          if (aiChatWindow) {
            aiChatWindow.classList.toggle('open');
          }
        }
      });
    }
  


  
    document.addEventListener('DOMContentLoaded', () => {
      const storedName = sessionStorage.getItem('userFullName');
      if (storedName) {
        const badge = document.querySelector('.user-badge');
        if (badge) {
          const span = badge.querySelector('span');
          if (span) span.textContent = storedName;

          const avatar = badge.querySelector('.avatar');
          if (avatar) {
            const parts = storedName.trim().split(/\s+/);
            let initials = '';
            if (parts.length > 1) {
              initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
            } else if (parts.length === 1 && parts[0].length > 0) {
              initials = parts[0].substring(0, 2).toUpperCase();
            }
            if (initials) avatar.textContent = initials;
          }
        }
      }
    });
  
  
    document.addEventListener('DOMContentLoaded', () => {
      const toggleBtns = document.querySelectorAll('button[title="Toggle dark mode"]');

      // Initialize
      if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        toggleBtns.forEach(btn => {
          const icon = btn.querySelector('i');
          if (icon) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
          }
        });
      }

      // Toggle
      toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const isDark = document.body.classList.toggle('dark-mode');
          localStorage.setItem('darkMode', isDark);

          toggleBtns.forEach(b => {
            const icon = b.querySelector('i');
            if (icon) {
              if (isDark) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
              } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
              }
            }
          });
        });
      });
    });
  

  
    document.addEventListener('DOMContentLoaded', () => {
      const activeSubLink = document.querySelector('.sub-link.active');
      if (activeSubLink) {
        const parentSubLinks = activeSubLink.closest('.sub-links');
        if (parentSubLinks) {
          parentSubLinks.classList.add('open');
        }
      }
    });
  
  <!-- AI Bot Logic and Styles -->
  <style id="ai-bot-logic-style">
    .ai-chat-body {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .ai-msg-bot {
      align-self: flex-start;
      background: white;
      padding: 10px 15px;
      border-radius: 15px;
      border-bottom-left-radius: 4px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
      max-width: 85%;
      font-size: 0.85rem;
      color: #2d3748;
      line-height: 1.4;
    }

    .ai-msg-bot strong {
      color: #1E355F;
      display: block;
      margin-bottom: 3px;
    }

    .ai-msg-user {
      align-self: flex-end;
      background: #1E355F;
      color: white;
      padding: 10px 15px;
      border-radius: 15px;
      border-bottom-right-radius: 4px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      max-width: 85%;
      font-size: 0.85rem;
      line-height: 1.4;
    }

    .typing-indicator {
      align-self: flex-start;
      font-size: 0.8rem;
      color: #94a3b8;
      font-style: italic;
      padding: 5px 15px;
    }

    body.dark-mode .ai-msg-bot {
      background: #334155;
      color: #f8fafc;
    }

    body.dark-mode .ai-msg-bot strong {
      color: #FCAE16;
    }
  </style>
  
    document.addEventListener('DOMContentLoaded', () => {
      const chatWrappers = document.querySelectorAll('.ai-chat-wrapper, .ai-bot-wrapper');

      chatWrappers.forEach(wrapper => {
        const chatBody = wrapper.querySelector('.ai-chat-body');
        const chatInput = wrapper.querySelector('.ai-chat-footer input');
        const sendBtn = wrapper.querySelector('.ai-chat-footer button');

        if (!chatBody || !chatInput || !sendBtn) return;

        // Format existing default message to use the new class
        const defaultMsg = chatBody.querySelector('p');
        if (defaultMsg && !defaultMsg.classList.contains('ai-msg-bot')) {
          const msgDiv = document.createElement('div');
          msgDiv.className = 'ai-msg-bot';
          msgDiv.innerHTML = defaultMsg.innerHTML;
          chatBody.innerHTML = '';
          chatBody.appendChild(msgDiv);
        }

        function appendMessage(sender, text) {
          const msg = document.createElement('div');
          if (sender === 'user') {
            msg.className = 'ai-msg-user';
            msg.textContent = text;
          } else {
            msg.className = 'ai-msg-bot';
            msg.innerHTML = '<strong>Mae:</strong> ' + text;
          }
          chatBody.appendChild(msg);
          chatBody.scrollTop = chatBody.scrollHeight;
        }

        function showTyping() {
          const typing = document.createElement('div');
          typing.className = 'typing-indicator';
          typing.textContent = 'Mae is typing...';
          chatBody.appendChild(typing);
          chatBody.scrollTop = chatBody.scrollHeight;
          return typing;
        }

        function handleSend() {
          const text = chatInput.value.trim();
          if (!text) return;

          // Add user message
          appendMessage('user', text);
          chatInput.value = '';

          // Show typing indicator
          const typing = showTyping();

          // Simulate delay
          setTimeout(() => {
            typing.remove();

            const lowerText = text.toLowerCase();
            let reply = "I'm not quite sure how to help with that. Try checking the sidebar for our request forms!";

            if (lowerText.includes('supply') || lowerText.includes('inventory') || lowerText.includes('item')) {
              reply = "You can view available supplies and make requests on the Supplies Dashboard! Make sure you are logged in to see the live inventory.";
            } else if (lowerText.includes('vehicle') || lowerText.includes('car') || lowerText.includes('driver')) {
              reply = "Need a ride or a driver? Check out the Vehicle Request and Driver Request forms on the left sidebar.";
            } else if (lowerText.includes('facility') || lowerText.includes('room') || lowerText.includes('meeting') || lowerText.includes('zoom')) {
              reply = "You can book Conference Rooms, Function Halls, Parking, and Zoom Meetings under the 'Facility Request' dropdown menu!";
            } else if (lowerText.includes('hello') || lowerText.includes('hi') || lowerText.includes('hey')) {
              reply = "Hello there! Let me know if you need help finding a form or checking your requests.";
            } else if (lowerText.includes('status') || lowerText.includes('pending') || lowerText.includes('approve')) {
              reply = "Your pending requests will be reviewed by the admin team soon. You will receive an email once it's approved!";
            }

            appendMessage('bot', reply);
          }, 1200);
        }

        sendBtn.addEventListener('click', handleSend);
        chatInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') handleSend();
        });
      });
    });
  
</body>

</html>
