const fs = require('fs');

const formConfigs = [
  {
    file: 'vehicle-request.html',
    table: 'vehicle_requests',
    formId: 'requestForm',
    fields: `
                  requestor_name: f.get('requestor'),
                  company: f.get('company'),
                  department: f.get('department'),
                  destination: f.get('destination'),
                  purpose: f.get('purpose'),
                  request_date: f.get('date'),
                  passengers: parseInt(f.get('passengers')),
                  start_time: f.get('startTime') + ':00',
                  end_time: f.get('endTime') + ':00'
    `
  },
  {
    file: 'driver-request.html',
    table: 'driver_requests',
    formId: 'requestForm',
    fields: `
                  requestor_name: f.get('requestor'),
                  company: f.get('company'),
                  department: f.get('department'),
                  destination: f.get('destination'),
                  purpose: f.get('purpose'),
                  request_date: f.get('date'),
                  passengers: parseInt(f.get('passengers')),
                  start_time: f.get('startTime') + ':00',
                  end_time: f.get('endTime') + ':00'
    `
  },
  {
    file: 'conference-request.html',
    table: 'conference_requests',
    formId: 'requestForm',
    fields: `
                  requestor_name: f.get('requestor'),
                  company: f.get('company'),
                  department: f.get('department'),
                  title: f.get('title'),
                  participants: parseInt(f.get('participants')),
                  request_date: f.get('date'),
                  start_time: f.get('startTime') + ':00',
                  end_time: f.get('endTime') + ':00'
    `
  },
  {
    file: 'function-request.html',
    table: 'function_requests',
    formId: 'requestForm',
    fields: `
                  requestor_name: f.get('requestor'),
                  company: f.get('company'),
                  department: f.get('department'),
                  title: f.get('title'),
                  participants: parseInt(f.get('participants')),
                  request_date: f.get('date'),
                  start_time: f.get('startTime') + ':00',
                  end_time: f.get('endTime') + ':00'
    `
  },
  {
    file: 'parking-request.html',
    table: 'parking_requests',
    formId: 'requestForm',
    fields: `
                  requestor_name: f.get('requestor'),
                  company: f.get('company'),
                  department: f.get('department'),
                  visitor: f.get('visitor'),
                  plate: f.get('plate'),
                  request_date: f.get('date'),
                  request_time: f.get('time') + ':00',
                  visit: f.get('visit')
    `
  },
  {
    file: 'zoom-request.html',
    table: 'zoom_requests',
    formId: 'meetingForm',
    fields: `
                  requestor_name: f.get('requestor'),
                  company: f.get('company'),
                  department: f.get('department'),
                  title: f.get('title'),
                  participants: parseInt(f.get('participants')),
                  request_date: f.get('date'),
                  start_time: f.get('startTime') + ':00',
                  end_time: f.get('endTime') + ':00',
                  access_details: f.get('accessDetails'),
                  notes: f.get('notes')
    `
  },
  {
    file: 'teams-request.html',
    table: 'teams_requests',
    formId: 'meetingForm',
    fields: `
                  requestor_name: f.get('requestor'),
                  company: f.get('company'),
                  department: f.get('department'),
                  title: f.get('title'),
                  participants: parseInt(f.get('participants')),
                  request_date: f.get('date'),
                  start_time: f.get('startTime') + ':00',
                  end_time: f.get('endTime') + ':00',
                  access_details: f.get('accessDetails'),
                  notes: f.get('notes')
    `
  },
  {
    file: 'liaison-request.html',
    table: 'liaison_requests',
    formId: 'requestForm',
    fields: `
                  requestor_name: f.get('requestor'),
                  company: f.get('company'),
                  department: f.get('department'),
                  destination: f.get('destination'),
                  documents: f.get('documents'),
                  contact_person: f.get('contactPerson'),
                  request_date: f.get('date'),
                  request_time: f.get('time') + ':00'
    `
  }
];

formConfigs.forEach(config => {
  try {
    let content = fs.readFileSync(config.file, 'utf8');
    
    // Replace script block that starts with var modal = document.getElementById('modal');
    // We will use regex to find the script tag containing the localstorage logic
    const scriptRegex = /<script>(?:(?!<\/script>)[\s\S])*localStorage\.setItem(?:(?!<\/script>)[\s\S])*<\/script>/;
    
    const newScript = `<script type="module">
    import { supabase } from './supabase-client.js';
    
    var modal = document.getElementById('modal'); 
    document.getElementById('${config.formId}').addEventListener('submit', async function (e) { 
        e.preventDefault(); 
        var f = new FormData(e.target);
        
        // Show loading state on button
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.textContent = 'Submitting...';
        btn.disabled = true;

        try {
            const { data, error } = await supabase
              .from('${config.table}')
              .insert([
                {
${config.fields}
                }
              ])
              .select();

            if (error) throw error;
            
            // success
            const refId = data[0].id.split('-')[0].toUpperCase();
            document.getElementById('reference').textContent = refId;
            modal.classList.add('open'); 
            e.target.reset();
        } catch (err) {
            alert('Error submitting request: ' + err.message);
            console.error(err);
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });
  </script>`;

    if (content.match(scriptRegex)) {
        content = content.replace(scriptRegex, newScript);
        fs.writeFileSync(config.file, content);
        console.log("Updated " + config.file);
    } else {
        console.log("Could not find script block in " + config.file);
    }

  } catch(e) {
    console.error("Error processing " + config.file, e);
  }
});
