import { supabase } from './supabase-client.js';

// --- DATE PARSING ENGINE ---
function extractDate(text) {
  const now = new Date();
  const lower = text.toLowerCase();

  // Relative words
  if (/\btoday\b/.test(lower)) {
    return {
      dateStr: now.toISOString().split('T')[0],
      display: now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    };
  }
  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return {
      dateStr: d.toISOString().split('T')[0],
      display: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    };
  }
  if (/\byesterday\b/.test(lower)) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return {
      dateStr: d.toISOString().split('T')[0],
      display: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    };
  }

  // Days of the week (e.g. this friday, next monday, on friday)
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < daysOfWeek.length; i++) {
    const dayName = daysOfWeek[i];
    const dayRegex = new RegExp(`\\b(?:next\\s+|this\\s+|on\\s+)?${dayName}\\b`, 'i');
    if (dayRegex.test(lower) && !lower.includes('today') && !lower.includes('tomorrow')) {
      const currentDay = now.getDay();
      let diff = i - currentDay;
      if (diff <= 0) diff += 7; // default to next upcoming occurrence
      const d = new Date(now);
      d.setDate(d.getDate() + diff);
      return {
        dateStr: d.toISOString().split('T')[0],
        display: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      };
    }
  }

  // ISO formats: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = text.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = String(isoMatch[2]).padStart(2, '0');
    const d = String(isoMatch[3]).padStart(2, '0');
    const dt = new Date(`${y}-${m}-${d}T00:00:00`);
    if (!isNaN(dt.getTime())) {
      return {
        dateStr: `${y}-${m}-${d}`,
        display: dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      };
    }
  }

  // MM/DD/YYYY or M/D/YYYY format
  const slashMatch = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (slashMatch) {
    const m = String(slashMatch[1]).padStart(2, '0');
    const d = String(slashMatch[2]).padStart(2, '0');
    const y = slashMatch[3];
    const dt = new Date(`${y}-${m}-${d}T00:00:00`);
    if (!isNaN(dt.getTime())) {
      return {
        dateStr: `${y}-${m}-${d}`,
        display: dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      };
    }
  }

  // Month Name Day (e.g. Nov 12, November 12, Nov 12 2026, 12 Nov, 12th of November)
  const monthNames = 'january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec';
  
  // Format: Nov 12 or November 12, 2026
  const mdRegex = new RegExp(`\\b(${monthNames})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, 'i');
  const mdMatch = text.match(mdRegex);
  if (mdMatch) {
    const monthStr = mdMatch[1];
    const day = parseInt(mdMatch[2], 10);
    const year = mdMatch[3] ? parseInt(mdMatch[3], 10) : now.getFullYear();
    const dt = new Date(`${monthStr} ${day}, ${year}`);
    if (!isNaN(dt.getTime())) {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      return {
        dateStr: `${y}-${m}-${d}`,
        display: dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      };
    }
  }

  // Format: 12 Nov or 12th of November 2026
  const dmRegex = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${monthNames})\\.?\\s*(\\d{4})?\\b`, 'i');
  const dmMatch = text.match(dmRegex);
  if (dmMatch) {
    const day = parseInt(dmMatch[1], 10);
    const monthStr = dmMatch[2];
    const year = dmMatch[3] ? parseInt(dmMatch[3], 10) : now.getFullYear();
    const dt = new Date(`${monthStr} ${day}, ${year}`);
    if (!isNaN(dt.getTime())) {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      return {
        dateStr: `${y}-${m}-${d}`,
        display: dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      };
    }
  }

  return null;
}

// Format 24-hr time (e.g. 08:00:00) into 12-hr format (e.g. 8:00 AM)
function formatTime12(timeStr) {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  let h = parseInt(parts[0], 10);
  const m = parts[1] || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

// Get active user info
async function getActiveUserInfo() {
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user || null;
  } catch (e) {
    // fallback
  }

  const storedName = sessionStorage.getItem('userFullName') || localStorage.getItem('userFullName') || '';
  return { user, storedName };
}

// --- QUERY DISPATCHER ---
async function processUserMessage(rawText) {
  const text = rawText.trim();
  const lower = text.toLowerCase();
  const dateInfo = extractDate(text);

  // 1. CONFERENCE ROOM AVAILABILITY
  if (lower.includes('conference') || lower.includes('conf room') || lower.includes('boardroom')) {
    if (!dateInfo) {
      return `
        I would love to check the <strong>Conference Room</strong> schedule for you! 📅<br><br>
        Please tell me which date you have in mind. For example:<br>
        • <em>"Is the conference room available on Nov 12?"</em><br>
        • <em>"Is the conference room free tomorrow?"</em><br>
        • <em>"Check conference room on 2026-11-20"</em>
      `;
    }

    try {
      const { data, error } = await supabase
        .from('conference_requests')
        .select('*')
        .eq('request_date', dateInfo.dateStr);

      if (error) throw error;

      const activeBookings = (data || []).filter(r => r.status === 'Approved' || r.status === 'Pending');

      if (activeBookings.length === 0) {
        return `
          <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:10px 12px; margin-bottom:6px;">
            <div style="color:#15803d; font-weight:700; font-size:0.9rem; display:flex; align-items:center; gap:6px;">
              🟢 100% Available All Day!
            </div>
            <div style="color:#334155; font-size:0.83rem; margin-top:4px;">
              The <strong>Conference Room</strong> has no scheduled bookings on <strong>${dateInfo.display}</strong>.
            </div>
          </div>
          👉 <a href="conference-request.html" style="color:#1E355F; font-weight:600; text-decoration:underline;">Click here to book this room now</a>
        `;
      }

      let slotsHtml = activeBookings.map(b => {
        const isApproved = b.status === 'Approved';
        const badgeColor = isApproved ? 'background:#dcfce7; color:#15803d;' : 'background:#fef9c3; color:#854d0e;';
        const icon = isApproved ? '🔴' : '⚠️';
        const timeFormatted = `${formatTime12(b.start_time)} – ${formatTime12(b.end_time)}`;
        return `
          <div style="background:#ffffff; border:1px solid #e2e8f0; border-left:4px solid ${isApproved ? '#ef4444' : '#f59e0b'}; border-radius:6px; padding:8px 10px; margin-top:6px; font-size:0.82rem;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:700; color:#1e293b;">${icon} ${timeFormatted}</span>
              <span style="${badgeColor} font-size:0.7rem; padding:2px 6px; border-radius:10px; font-weight:600;">${b.status}</span>
            </div>
            <div style="color:#475569; margin-top:3px;">
              <strong>Title:</strong> ${b.title || 'Reserved'}<br>
              <span style="color:#64748b; font-size:0.75rem;">Requestor: ${b.requestor_name || 'Staff'} (${b.department || 'N/A'})</span>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div>
          📅 <strong>Conference Room on ${dateInfo.display}:</strong>
          <div style="color:#64748b; font-size:0.78rem; margin-bottom:4px;">There are ${activeBookings.length} booking(s) found on this day:</div>
          ${slotsHtml}
          <div style="margin-top:8px; font-size:0.8rem; color:#475569;">
            💡 <em>Hours outside these slots may still be reserved!</em><br>
            👉 <a href="conference-request.html" style="color:#1E355F; font-weight:600; text-decoration:underline;">Book Conference Room</a>
          </div>
        </div>
      `;
    } catch (err) {
      console.error('Mae AI query error:', err);
      return `I encountered an issue querying the conference room records. Please try again or check the <a href="conference-request.html">Conference Room Request</a> page directly!`;
    }
  }

  // 2. FUNCTION HALL AVAILABILITY
  if (lower.includes('function hall') || lower.includes('function room') || lower.includes('event hall')) {
    if (!dateInfo) {
      return `
        I can check the <strong>Function Hall</strong> schedule! 🏛️<br><br>
        Which date would you like me to inspect? (e.g., <em>"Is function hall available on Nov 15?"</em> or <em>"Is it free tomorrow?"</em>)
      `;
    }

    try {
      const { data, error } = await supabase
        .from('function_requests')
        .select('*')
        .eq('request_date', dateInfo.dateStr);

      if (error) throw error;

      const activeBookings = (data || []).filter(r => r.status === 'Approved' || r.status === 'Pending');

      if (activeBookings.length === 0) {
        return `
          <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:10px 12px; margin-bottom:6px;">
            <div style="color:#15803d; font-weight:700; font-size:0.9rem;">
              🟢 Function Hall is Fully Available!
            </div>
            <div style="color:#334155; font-size:0.83rem; margin-top:4px;">
              No booked events scheduled on <strong>${dateInfo.display}</strong>.
            </div>
          </div>
          👉 <a href="function-request.html" style="color:#1E355F; font-weight:600; text-decoration:underline;">Click here to reserve the Function Hall</a>
        `;
      }

      let slotsHtml = activeBookings.map(b => {
        const timeFormatted = `${formatTime12(b.start_time)} – ${formatTime12(b.end_time)}`;
        return `
          <div style="background:#ffffff; border:1px solid #e2e8f0; border-left:4px solid #f59e0b; border-radius:6px; padding:8px 10px; margin-top:6px; font-size:0.82rem;">
            <strong>${timeFormatted}</strong> (${b.status})<br>
            <span><strong>Event:</strong> ${b.title || 'Event'} (${b.participants || 0} pax)</span><br>
            <span style="color:#64748b; font-size:0.75rem;">Reserved by: ${b.requestor_name || 'Staff'}</span>
          </div>
        `;
      }).join('');

      return `
        📅 <strong>Function Hall on ${dateInfo.display}:</strong>
        ${slotsHtml}
        <div style="margin-top:8px; font-size:0.8rem;">
          👉 <a href="function-request.html" style="color:#1E355F; font-weight:600; text-decoration:underline;">Submit Function Hall Request</a>
        </div>
      `;
    } catch (err) {
      console.error(err);
      return `Error retrieving Function Hall data. Please check the <a href="function-request.html">Function Request</a> form.`;
    }
  }

  // 3. GENERIC ROOM / FACILITIES CHECK (if user just says "is any room free on [date]?" or "meeting room")
  if (lower.includes('room') || lower.includes('facility')) {
    if (dateInfo) {
      try {
        const [confRes, funcRes] = await Promise.all([
          supabase.from('conference_requests').select('*').eq('request_date', dateInfo.dateStr),
          supabase.from('function_requests').select('*').eq('request_date', dateInfo.dateStr)
        ]);

        const confActive = (confRes.data || []).filter(r => r.status === 'Approved' || r.status === 'Pending');
        const funcActive = (funcRes.data || []).filter(r => r.status === 'Approved' || r.status === 'Pending');

        const confStatus = confActive.length === 0 ? '🟢 <strong>Conference Room:</strong> 100% Free' : `🔴 <strong>Conference Room:</strong> ${confActive.length} booking(s)`;
        const funcStatus = funcActive.length === 0 ? '🟢 <strong>Function Hall:</strong> 100% Free' : `🔴 <strong>Function Hall:</strong> ${funcActive.length} booking(s)`;

        return `
          🏢 <strong>Facility Overview on ${dateInfo.display}:</strong><br><br>
          • ${confStatus}<br>
          • ${funcStatus}<br><br>
          👉 <a href="conference-request.html" style="color:#1E355F; font-weight:600; text-decoration:underline;">Book Conference Room</a> | 
          <a href="function-request.html" style="color:#1E355F; font-weight:600; text-decoration:underline;">Book Function Hall</a>
        `;
      } catch (e) {
        // fallback
      }
    }
  }

  // 4. PARKING AVAILABILITY
  if (lower.includes('parking') || lower.includes('parking slot') || lower.includes('parking space')) {
    if (!dateInfo) {
      return `
        Looking for a visitor parking slot? 🚗<br>
        Tell me the date you'd like to check (e.g. <em>"Is parking available tomorrow?"</em> or <em>"Parking slot on Nov 10"</em>).
      `;
    }

    try {
      const { data } = await supabase
        .from('parking_requests')
        .select('*')
        .eq('request_date', dateInfo.dateStr);

      const count = (data || []).length;
      return `
        🅿️ <strong>Parking on ${dateInfo.display}:</strong><br>
        There are currently <strong>${count}</strong> registered visitor parking reservation(s) on this date.<br><br>
        👉 <a href="parking-request.html" style="color:#1E355F; font-weight:600; text-decoration:underline;">Reserve a Parking Slot</a>
      `;
    } catch (e) {
      return `You can request visitor parking access on the <a href="parking-request.html">Parking Request</a> form!`;
    }
  }

  // 5. VEHICLE & DRIVER SCHEDULE
  if (lower.includes('vehicle') || lower.includes('car') || lower.includes('van') || lower.includes('driver') || lower.includes('trip')) {
    if (dateInfo) {
      try {
        const { data: vData } = await supabase
          .from('vehicle_requests')
          .select('*')
          .eq('request_date', dateInfo.dateStr);

        const trips = vData || [];
        if (trips.length === 0) {
          return `
            🚙 <strong>Vehicle Availability on ${dateInfo.display}:</strong><br>
            No company vehicle trips currently scheduled for this date!<br><br>
            ⚠️ <em>Remember: Make sure you have completed any pending driver feedback before submitting.</em><br>
            👉 <a href="vehicle-request.html" style="color:#1E355F; font-weight:600; text-decoration:underline;">Submit Vehicle Request</a>
          `;
        }

        const tripList = trips.map(t => `
          <div style="background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:6px 10px; margin-top:4px; font-size:0.8rem;">
            <strong>${formatTime12(t.start_time)}</strong>: ${t.destination || 'Trip'} (${t.status})
          </div>
        `).join('');

        return `
          🚙 <strong>Scheduled Trips on ${dateInfo.display}:</strong>
          ${tripList}
          <div style="margin-top:8px;">
            👉 <a href="vehicle-request.html" style="color:#1E355F; font-weight:600; text-decoration:underline;">Request a Vehicle</a>
          </div>
        `;
      } catch (e) {
        // fallback
      }
    }

    return `
      Need a ride or a designated driver? 🚗<br><br>
      • <a href="vehicle-request.html" style="color:#1E355F; font-weight:600; text-decoration:underline;">Vehicle Request</a>: Book an official vehicle for company business.<br>
      • <a href="driver-request.html" style="color:#1E355F; font-weight:600; text-decoration:underline;">Driver Request</a>: Request dedicated driver dispatch.<br><br>
      ⭐ <em>Note: Our system enforces driver ratings after completed trips to maintain top service quality!</em>
    `;
  }

  // 6. ZOOM & MS TEAMS
  if (lower.includes('zoom') || lower.includes('teams') || lower.includes('virtual meeting')) {
    if (dateInfo) {
      try {
        const { data: zData } = await supabase
          .from('zoom_requests')
          .select('*')
          .eq('request_date', dateInfo.dateStr);

        const count = (zData || []).length;
        return `
          💻 <strong>Zoom Meetings on ${dateInfo.display}:</strong><br>
          There are <strong>${count}</strong> scheduled Zoom meeting account reservations on this date.<br><br>
          👉 <a href="zoom-request.html" style="color:#1E355F; font-weight:600; text-decoration:underline;">Book Zoom Account</a> | <a href="teams-request.html" style="color:#1E355F; font-weight:600; text-decoration:underline;">Book MS Teams</a>
        `;
      } catch (e) {
        // fallback
      }
    }
    return `You can schedule virtual meetings under <a href="zoom-request.html">Zoom Request</a> or <a href="teams-request.html">MS Teams Request</a>!`;
  }

  // 7. CHECK MY REQUESTS (User's Requests & Status)
  if (
    lower.includes('my request') || 
    lower.includes('my pending') || 
    lower.includes('status of my') || 
    lower.includes('check my') ||
    lower.includes('did my') ||
    lower.includes('is my') ||
    (lower.includes('status') && (lower.includes('pending') || lower.includes('approved')))
  ) {
    const { user, storedName } = await getActiveUserInfo();
    const cleanName = storedName ? storedName.trim() : '';

    if (!user && !cleanName) {
      return `To check your personal request status, please make sure you are logged in! You can also view your live submissions directly on the <a href="welcome.html">User Dashboard</a>.`;
    }

    try {
      const tables = [
        { name: 'Conference Room', table: 'conference_requests' },
        { name: 'Vehicle Request', table: 'vehicle_requests' },
        { name: 'Function Hall', table: 'function_requests' },
        { name: 'Zoom Meeting', table: 'zoom_requests' },
        { name: 'Driver Request', table: 'driver_requests' },
        { name: 'Parking Slot', table: 'parking_requests' }
      ];

      const queries = tables.map(async t => {
        let q = supabase.from(t.table).select('*').order('created_at', { ascending: false }).limit(3);
        if (user && t.table === 'vehicle_requests') {
          q = cleanName ? q.or(`user_id.eq.${user.id},requestor_name.ilike.%${cleanName}%`) : q.eq('user_id', user.id);
        } else if (cleanName) {
          q = q.ilike('requestor_name', `%${cleanName}%`);
        }
        const res = await q;
        return (res.data || []).map(item => ({ ...item, _type: t.name }));
      });

      const allResults = (await Promise.all(queries)).flat();
      allResults.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      if (allResults.length === 0) {
        return `
          I checked your records, <strong>${cleanName || 'there'}</strong>, and didn't find any recent requests submitted under your name.<br><br>
          Need to submit one? Check out the forms on the left navigation panel!
        `;
      }

      const top5 = allResults.slice(0, 4);
      let listHtml = top5.map(r => {
        let statusBadge = '';
        if (r.status === 'Approved') statusBadge = '<span style="background:#dcfce7; color:#15803d; font-size:0.7rem; padding:2px 6px; border-radius:10px; font-weight:600;">Approved</span>';
        else if (r.status === 'Pending') statusBadge = '<span style="background:#fef9c3; color:#854d0e; font-size:0.7rem; padding:2px 6px; border-radius:10px; font-weight:600;">Pending</span>';
        else if (r.status === 'Rejected') statusBadge = '<span style="background:#fee2e2; color:#b91c1c; font-size:0.7rem; padding:2px 6px; border-radius:10px; font-weight:600;">Rejected</span>';
        else statusBadge = `<span style="background:#f1f5f9; color:#475569; font-size:0.7rem; padding:2px 6px; border-radius:10px; font-weight:600;">${r.status || 'Active'}</span>`;

        const title = r.title || r.destination || r.purpose || r.visitor || 'Request';
        const date = r.request_date || (r.created_at ? r.created_at.split('T')[0] : '');

        return `
          <div style="background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:6px 10px; margin-top:5px; font-size:0.8rem;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <strong style="color:#1E355F;">${r._type}</strong>
              ${statusBadge}
            </div>
            <div style="color:#334155; margin-top:2px;">${title}</div>
            <div style="color:#94a3b8; font-size:0.72rem;">${date}</div>
          </div>
        `;
      }).join('');

      return `
        📋 <strong>Your Recent Requests:</strong>
        ${listHtml}
        <div style="margin-top:8px; font-size:0.8rem;">
          👉 View full history on your <a href="welcome.html" style="color:#1E355F; font-weight:600; text-decoration:underline;">User Dashboard</a>.
        </div>
      `;
    } catch (e) {
      console.error(e);
      return `You can monitor all your pending and approved requests anytime on the <a href="welcome.html">User Dashboard</a>!`;
    }
  }

  // 8. SUPPLIES & INVENTORY
  if (lower.includes('supply') || lower.includes('supplies') || lower.includes('inventory') || lower.includes('item') || lower.includes('stock')) {
    return `
      📦 <strong>Office Supplies &amp; Inventory:</strong><br>
      You can view live stock levels, request stationery, and monitor re-order thresholds directly on the 
      <a href="supplies-dashboard.html" style="color:#1E355F; font-weight:600; text-decoration:underline;">Supplies Dashboard</a>!
    `;
  }

  // 9. LIAISON SERVICE
  if (lower.includes('liaison') || lower.includes('document delivery') || lower.includes('messenger')) {
    return `
      📨 Need documents or checks delivered or processed? Check out the 
      <a href="liaison-request.html" style="color:#1E355F; font-weight:600; text-decoration:underline;">Liaison Request</a> form!
    `;
  }

  // 10. GREETINGS & CASUAL TALK
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey') || lower.includes('good morning') || lower.includes('good afternoon')) {
    return `
      Hello! 😊 I'm <strong>Mae</strong>, your AI Assistant connected live to our database.<br><br>
      Here are a few things you can ask me:
      <div class="ai-chip-container" style="display:flex; flex-direction:column; gap:5px; margin-top:8px;">
        <span class="ai-chip-prompt" style="background:#f1f5f9; padding:5px 10px; border-radius:6px; font-size:0.78rem; cursor:pointer; border:1px solid #cbd5e1; color:#1E355F;" onclick="window.maeSendPrompt('Is the conference room available tomorrow?')">📅 "Is the conference room available tomorrow?"</span>
        <span class="ai-chip-prompt" style="background:#f1f5f9; padding:5px 10px; border-radius:6px; font-size:0.78rem; cursor:pointer; border:1px solid #cbd5e1; color:#1E355F;" onclick="window.maeSendPrompt('What are my pending requests?')">📋 "What are my pending requests?"</span>
        <span class="ai-chip-prompt" style="background:#f1f5f9; padding:5px 10px; border-radius:6px; font-size:0.78rem; cursor:pointer; border:1px solid #cbd5e1; color:#1E355F;" onclick="window.maeSendPrompt('Is the function hall available on Nov 15?')">🏛️ "Is the function hall available on Nov 15?"</span>
      </div>
    `;
  }

  // Default fallback
  return `
    I'm not completely sure about that, but I can check live availability for:
    <br>• <strong>Conference Rooms</strong> (e.g. <em>"Is the conference room available on [date]?"</em>)
    <br>• <strong>Function Hall</strong> &amp; <strong>Parking Slots</strong>
    <br>• <strong>Vehicles &amp; Drivers</strong>
    <br>• <strong>Your Request Status</strong> (e.g. <em>"What are my pending requests?"</em>)
    <br><br>Feel free to select a request form on the left navigation panel!
  `;
}

// --- ATTACH TO DOM ---
function initMaeBot() {
  if (!document.getElementById('ai-bot-enhanced-style')) {
    const style = document.createElement('style');
    style.id = 'ai-bot-enhanced-style';
    style.textContent = `
      .ai-msg-bot {
        max-width: 90% !important;
        word-break: break-word;
      }
      .ai-msg-bot a {
        color: #1E355F;
        font-weight: 600;
        text-decoration: underline;
      }
      body.dark-mode .ai-msg-bot a {
        color: #FCAE16 !important;
      }
      .ai-chip-prompt {
        transition: all 0.2s ease;
        display: inline-block;
      }
      .ai-chip-prompt:hover {
        background: #1E355F !important;
        color: #ffffff !important;
        border-color: #1E355F !important;
        transform: translateY(-1px);
      }
      body.dark-mode .ai-chip-prompt {
        background: #1e293b !important;
        border-color: #475569 !important;
        color: #f8fafc !important;
      }
      body.dark-mode .ai-chip-prompt:hover {
        background: #FCAE16 !important;
        color: #0f172a !important;
        border-color: #FCAE16 !important;
      }
    `;
    document.head.appendChild(style);
  }

  const chatWrappers = document.querySelectorAll('.ai-chat-wrapper, .ai-bot-wrapper');

  chatWrappers.forEach(wrapper => {
    const chatBody = wrapper.querySelector('.ai-chat-body');
    const chatInput = wrapper.querySelector('.ai-chat-footer input');
    const sendBtn = wrapper.querySelector('.ai-chat-footer button');

    if (!chatBody || !chatInput || !sendBtn) return;

    // Enhance default message
    const defaultMsg = chatBody.querySelector('p');
    if (defaultMsg && !defaultMsg.classList.contains('ai-msg-bot')) {
      const msgDiv = document.createElement('div');
      msgDiv.className = 'ai-msg-bot';
      msgDiv.innerHTML = `
        <strong>Mae:</strong> Hello! How can I help you today? You can ask me if the <strong>Conference Room</strong> or <strong>Function Hall</strong> is available on any date!
      `;
      chatBody.innerHTML = '';
      chatBody.appendChild(msgDiv);
    }

    function appendMessage(sender, htmlContent) {
      const msg = document.createElement('div');
      if (sender === 'user') {
        msg.className = 'ai-msg-user';
        msg.textContent = htmlContent;
      } else {
        msg.className = 'ai-msg-bot';
        msg.innerHTML = '<strong>Mae:</strong> ' + htmlContent;
      }
      chatBody.appendChild(msg);
      chatBody.scrollTop = chatBody.scrollHeight;
    }

    function showTyping() {
      const typing = document.createElement('div');
      typing.className = 'typing-indicator';
      typing.textContent = 'Mae is checking database...';
      chatBody.appendChild(typing);
      chatBody.scrollTop = chatBody.scrollHeight;
      return typing;
    }

    async function handleSend(customText) {
      const text = (customText !== undefined ? customText : chatInput.value).trim();
      if (!text) return;

      appendMessage('user', text);
      if (customText === undefined) {
        chatInput.value = '';
      }

      const typing = showTyping();

      try {
        const replyHtml = await processUserMessage(text);
        typing.remove();
        appendMessage('bot', replyHtml);
      } catch (err) {
        typing.remove();
        console.error('Error in Mae reply:', err);
        appendMessage('bot', "I'm having a brief connection issue checking the database. Please try again in a moment.");
      }
    }

    sendBtn.addEventListener('click', () => handleSend());
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSend();
    });

    // Expose quick prompt helper for clickable chips
    window.maeSendPrompt = function(promptText) {
      handleSend(promptText);
    };
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMaeBot);
} else {
  initMaeBot();
}
