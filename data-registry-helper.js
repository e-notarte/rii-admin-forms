/**
 * Data Registry Dynamic Synchronizer
 * Automatically pulls Companies and Departments from Data Registry records (localStorage)
 * and populates form dropdowns with live filtering.
 */
(function () {
  const DEFAULT_COMPANIES = [
    { code: 'RBI', name: 'R-II Builders, Inc. (RBI)' },
    { code: 'RMRCI', name: 'R-II Metro Rail Transport Services, Inc. (RMRCI)' },
    { code: 'PESC', name: 'Philippine Ecology Systems Corp. (PESC)' },
    { code: 'RLAND', name: 'R-Land Development Inc. (RLAND)' },
    { code: 'FRHI', name: 'First R-II Holdings Inc. (FRHI)' }
  ];

  const DEFAULT_DEPARTMENTS = [
    { code: 'ADMIN', name: 'Admin', company: 'ALL' },
    { code: 'HR', name: 'HR', company: 'ALL' },
    { code: 'PURCHASING', name: 'Purchasing', company: 'ALL' },
    { code: 'BDG', name: 'BDG', company: 'ALL' },
    { code: 'ENGINEERING', name: 'Engineering', company: 'ALL' },
    { code: 'C&C', name: 'C&C', company: 'ALL' },
    { code: 'ACCOUNTING', name: 'Accounting', company: 'ALL' },
    { code: 'FINANCE', name: 'Finance', company: 'ALL' },
    { code: 'EXECUTIVE', name: 'Executive', company: 'ALL' },
    { code: 'OPERATIONS', name: 'Operations', company: 'ALL' },
    { code: 'CRMD', name: 'CRMD', company: 'ALL' },
    { code: 'ESSH', name: 'ESSH', company: 'ALL' },
    { code: 'OTP', name: 'OTP', company: 'ALL' }
  ];

  function getRegistryRecords() {
    try {
      const raw = localStorage.getItem('directory_register_records');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading directory_register_records:', e);
    }
    return [];
  }

  function getCompanies() {
    const records = getRegistryRecords();
    const registered = records.filter(r => r.type === 'Company');
    if (registered.length > 0) {
      return registered.map(r => ({
        code: r.code,
        name: r.name.includes(r.code) ? r.name : `${r.name} (${r.code})`
      }));
    }
    return DEFAULT_COMPANIES;
  }

  function getDepartments(selectedCompany) {
    const records = getRegistryRecords();
    const registered = records.filter(r => r.type === 'Department');
    const source = registered.length > 0 ? registered.map(r => ({
      code: r.code,
      name: r.name || r.code,
      company: r.company || (r.details && r.details.includes('Company:') ? r.details.split('Company:')[1].trim() : 'ALL')
    })) : DEFAULT_DEPARTMENTS;

    if (!selectedCompany) {
      return source;
    }

    const filtered = source.filter(d => {
      if (!d.company || d.company === 'ALL') return true;
      return d.company.toUpperCase() === selectedCompany.toUpperCase();
    });

    return filtered.length > 0 ? filtered : source;
  }

  function syncFormDropdowns() {
    // Find all company selects in user forms or admin forms
    const companySelects = document.querySelectorAll('select[name="company"], select#fbCompany, select#company');
    const departmentSelects = document.querySelectorAll('select[name="department"], select#fbDepartment, select#department');

    const companies = getCompanies();

    companySelects.forEach((compSelect, idx) => {
      const deptSelect = departmentSelects[idx] || departmentSelects[0];
      const currentCompVal = compSelect.value;

      // Build company options
      let compHtml = '<option value="" disabled selected>-- Select Company --</option>';
      companies.forEach(c => {
        compHtml += `<option value="${escapeHtml(c.code)}">${escapeHtml(c.name)}</option>`;
      });
      compSelect.innerHTML = compHtml;
      if (currentCompVal && companies.some(c => c.code === currentCompVal)) {
        compSelect.value = currentCompVal;
      }

      // Helper to populate department select
      const updateDepts = (companyCode) => {
        if (!deptSelect) return;
        const currentDeptVal = deptSelect.value;
        const depts = getDepartments(companyCode);

        let deptHtml = '<option value="" disabled selected>-- Select Department --</option>';
        depts.forEach(d => {
          deptHtml += `<option value="${escapeHtml(d.name)}">${escapeHtml(d.name)}</option>`;
        });
        deptSelect.innerHTML = deptHtml;
        if (currentDeptVal && depts.some(d => d.name === currentDeptVal)) {
          deptSelect.value = currentDeptVal;
        }
      };

      // Initial department population
      updateDepts(compSelect.value);

      // On company change listener
      if (!compSelect.dataset.registryBound) {
        compSelect.addEventListener('change', function () {
          updateDepts(this.value);
        });
        compSelect.dataset.registryBound = 'true';
      }
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Expose globally
  window.DataRegistryHelper = {
    getCompanies,
    getDepartments,
    syncFormDropdowns
  };

  // Run on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncFormDropdowns);
  } else {
    syncFormDropdowns();
  }

  // Re-sync if storage changes in another tab
  window.addEventListener('storage', (e) => {
    if (e.key === 'directory_register_records') {
      syncFormDropdowns();
    }
  });
})();
