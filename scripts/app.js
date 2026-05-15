let selectedDateKey = null;
    let selectedDetailOpen = false;
    let detailToggleTouched = false;
    let workRecords = {};
    let allowances = [];
    const manualScheduleColors = ['#22c55e', '#2563eb', '#f97316', '#7c3aed', '#06b6d4', '#ec4899', '#eab308', '#64748b'];
    let scheduleColorMap = {};
    let calendarHasBeenBuilt = false;
    let calendarApplyTimer = null;
    let activeAllowancePickerId = null;
    let lastCalculationRows = [];
    let lastCalculationSummary = null;
    let hasCalculatedOnce = false;
    let isDirty = false;
    let dirtyWatchInstalled = false;
    let mobileResultDetailsOpen = false;
    let detailViewMode = false;
    let lastCalendarPeriod = { year: 2026, month: 4 };
    const CALCULATOR_DRAFT_KEY = 'albabee_calculator_draft_v1';
    const CALCULATOR_UI_STATE_KEY = 'albabee_calculator_ui_state_v1';
    const LEGACY_SESSION_DRAFT_KEY = 'albabee_calculator_session_draft_v1';
    const LEGACY_LOCAL_STORAGE_KEYS = [
      CALCULATOR_DRAFT_KEY,
      CALCULATOR_UI_STATE_KEY,
      LEGACY_SESSION_DRAFT_KEY,
      'albaPayViewMode'
    ];
    const CALCULATOR_DRAFT_VERSION = 1;
    const CALCULATOR_UI_STATE_VERSION = 1;
    let draftSaveTimer = null;
    let draftRestoreInProgress = false;
    let draftClearedByUser = false;
    let draftPersistenceReady = false;
    let viewModeResizeTimer = null;


    function updateDirtyUI(){
      const notice = document.getElementById('dirtyNotice');
      const btn = document.getElementById('calculateBtn');
      if(notice) notice.classList.toggle('show', !!isDirty);
      if(btn){
        btn.classList.toggle('dirty', !!isDirty);
        btn.textContent = isDirty ? '다시 계산하기' : '월급 계산하기';
        btn.setAttribute('aria-label', isDirty ? '변경된 내용으로 다시 계산하기' : '월급 계산하기');
      }
    }
    function markDirty(){
      if(!hasCalculatedOnce) return;
      isDirty = true;
      updateDirtyUI();
    }
    function scheduleCalculatorDraftSave(){
      if(!draftPersistenceReady) return;
      if(draftRestoreInProgress) return;
      draftClearedByUser = false;
      clearTimeout(draftSaveTimer);
      draftSaveTimer = setTimeout(saveCalculatorDraftNow, 450);
    }
    function getCalculatorUiState(){
      const stepIds = ['basicSection','workCalendarSection','allowanceSection','legalOptionSection'];
      const accordionIds = ['legalNoticeAccordion','resultToolsAccordion','detailTableAccordion'];
      const editPanel = document.getElementById('editPanel');
      const mobileSheet = document.getElementById('mobileDaySheet');
      const shareBox = document.getElementById('shareLinkBox');
      const steps = {};
      stepIds.forEach(function(id){
        const section = document.getElementById(id);
        if(!section) return;
        steps[id] = {
          open: section.classList.contains('step-open'),
          completed: section.classList.contains('step-completed'),
          unlocked: section.classList.contains('step-unlocked'),
          locked: section.classList.contains('step-locked')
        };
      });
      const accordions = {};
      accordionIds.forEach(function(id){
        const box = document.getElementById(id);
        if(box) accordions[id] = box.classList.contains('open');
      });
      return {
        version: CALCULATOR_UI_STATE_VERSION,
        savedAt: new Date().toISOString(),
        steps: steps,
        selectedDateKey: selectedDateKey,
        selectedDetailOpen: selectedDetailOpen,
        detailToggleTouched: detailToggleTouched,
        detailViewMode: detailViewMode,
        editPanelOpen: !!(editPanel && editPanel.classList.contains('show')),
        mobileDaySheetOpen: !!(mobileSheet && mobileSheet.classList.contains('show')),
        accordions: accordions,
        shareLinkBoxOpen: !!(shareBox && shareBox.classList.contains('show')),
        hasCalculatedOnce: hasCalculatedOnce,
        mobileResultDetailsOpen: mobileResultDetailsOpen,
        scrollY: window.scrollY || window.pageYOffset || 0
      };
    }
    function saveCalculatorUiStateNow(){
      if(!draftPersistenceReady) return;
      if(draftRestoreInProgress) return;
      if(draftClearedByUser) return;
      try { sessionStorage.setItem(CALCULATOR_UI_STATE_KEY, JSON.stringify(getCalculatorUiState())); } catch(e) {}
    }
    function saveCalculatorDraftNow(){
      if(!draftPersistenceReady) return;
      if(draftRestoreInProgress) return;
      if(draftClearedByUser) return;
      try {
        const data = collectProjectData();
        const payload = {
          version: CALCULATOR_DRAFT_VERSION,
          savedAt: new Date().toISOString(),
          data: data
        };
        sessionStorage.setItem(CALCULATOR_DRAFT_KEY, JSON.stringify(payload));
        saveCalculatorUiStateNow();
      } catch(e) {}
    }
    function clearCalculatorDraft(){
      clearTimeout(draftSaveTimer);
      try { sessionStorage.removeItem(CALCULATOR_DRAFT_KEY); } catch(e) {}
      try { sessionStorage.removeItem(CALCULATOR_UI_STATE_KEY); } catch(e) {}
      try { sessionStorage.removeItem(LEGACY_SESSION_DRAFT_KEY); } catch(e) {}
      try { localStorage.removeItem(CALCULATOR_DRAFT_KEY); } catch(e) {}
      try { localStorage.removeItem(CALCULATOR_UI_STATE_KEY); } catch(e) {}
      try { localStorage.removeItem(LEGACY_SESSION_DRAFT_KEY); } catch(e) {}
      try { localStorage.removeItem('albaPayViewMode'); } catch(e) {}
    }
    function clearLegacyDraftStorage(){
      try { sessionStorage.removeItem(LEGACY_SESSION_DRAFT_KEY); } catch(e) {}
      LEGACY_LOCAL_STORAGE_KEYS.forEach(function(key){
        try { localStorage.removeItem(key); } catch(e) {}
      });
    }
    function restoreCalculatorDraft(){
      let payload = null;
      try {
        const raw = sessionStorage.getItem(CALCULATOR_DRAFT_KEY);
        if(!raw) return false;
        payload = JSON.parse(raw);
      } catch(e) {
        clearCalculatorDraft();
        return false;
      }
      if(!payload || Number(payload.version) !== CALCULATOR_DRAFT_VERSION || !payload.data) return false;
      try {
        draftRestoreInProgress = true;
        applyProjectData({ ...payload.data, keepAllRecords: true });
        const hasRecords = payload.data.workRecords && Object.keys(payload.data.workRecords).length > 0;
        const hasWage = Number(payload.data.hourlyWage) > 0;
        if(hasRecords && hasWage) calculateMonthlyPay();
        return true;
      } catch(e) {
        return false;
      } finally {
        draftRestoreInProgress = false;
      }
    }
    function setAccordionOpen(id, open){
      const box = document.getElementById(id);
      if(!box) return;
      box.classList.toggle('open', !!open);
      const head = box.querySelector('.collapsible-head');
      if(head) head.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    function restoreCalculatorUiState(){
      let state = null;
      try {
        const raw = sessionStorage.getItem(CALCULATOR_UI_STATE_KEY);
        if(!raw) return false;
        state = JSON.parse(raw);
      } catch(e) {
        try { sessionStorage.removeItem(CALCULATOR_UI_STATE_KEY); } catch(removeError) {}
        return false;
      }
      if(!state || Number(state.version) !== CALCULATOR_UI_STATE_VERSION) return false;
      try {
        draftRestoreInProgress = true;
        if(state.steps){
          Object.keys(state.steps).forEach(function(id){
            const section = document.getElementById(id);
            const saved = state.steps[id];
            if(!section || !saved) return;
            section.classList.toggle('step-completed', !!saved.completed);
            section.classList.toggle('step-unlocked', !!saved.unlocked);
            section.classList.toggle('step-locked', !!saved.locked);
            setStepOpen(id, !!saved.open);
          });
        }
        selectedDateKey = state.selectedDateKey || selectedDateKey;
        selectedDetailOpen = !!state.selectedDetailOpen;
        detailToggleTouched = !!state.detailToggleTouched;
        detailViewMode = !!state.detailViewMode;
        document.body.classList.toggle('pc-detail-hover', detailViewMode && !isMobileView());
        updateDetailModeButton();
        renderCalendar();
        if(state.editPanelOpen && selectedDateKey && workRecords[selectedDateKey]){
          const parts = selectedDateKey.split('-').map(Number);
          selectDay(selectedDateKey, parts[0], parts[1], parts[2], selectedDetailOpen);
        } else {
          updateSelectedDayDetails();
        }
        if(state.mobileDaySheetOpen && selectedDateKey && workRecords[selectedDateKey] && isMobileView()) showMobileDaySheet(selectedDateKey);
        if(state.accordions){
          Object.keys(state.accordions).forEach(function(id){ setAccordionOpen(id, !!state.accordions[id]); });
        }
        const shareBox = document.getElementById('shareLinkBox');
        if(shareBox && state.shareLinkBoxOpen) shareBox.classList.add('show');
        hasCalculatedOnce = !!state.hasCalculatedOnce || hasCalculatedOnce;
        mobileResultDetailsOpen = !!state.mobileResultDetailsOpen;
        window.setTimeout(function(){
          if(Number.isFinite(Number(state.scrollY))) window.scrollTo(0, Math.max(0, Number(state.scrollY)));
        }, 0);
        return true;
      } catch(e) {
        return false;
      } finally {
        draftRestoreInProgress = false;
      }
    }
    function clearDirty(){
      isDirty = false;
      updateDirtyUI();
    }
    function updateLastCalculated(){
      const box = document.getElementById('lastCalculated');
      if(!box) return;
      const now = new Date();
      const text = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + ' ' +
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0');
      box.textContent = '마지막 계산: ' + text;
    }
    function installDirtyWatch(){
      if(dirtyWatchInstalled) return;
      dirtyWatchInstalled = true;
      document.addEventListener('input', function(e){
        const target = e.target;
        if(!target || target.closest('#shareLinkBox') || target.closest('.policy-modal')) return;
        if(target.matches('input, select, textarea')) markDirty();
        if(target.matches('input, select, textarea')) scheduleCalculatorDraftSave();
      }, true);
      document.addEventListener('change', function(e){
        const target = e.target;
        if(!target || target.closest('#shareLinkBox') || target.closest('.policy-modal')) return;
        if(target.matches('input, select, textarea')) markDirty();
        if(target.matches('input, select, textarea')) scheduleCalculatorDraftSave();
      }, true);
      document.addEventListener('click', function(e){
        const target = e.target;
        if(!target || target.closest('#shareLinkBox') || target.closest('.policy-modal')) return;
        if(target.closest('#calendar .day:not(.empty)') && !detailViewMode) markDirty();
        if(target.closest('.weekday-btn')) markDirty();
        if(target.closest('#calendar .day:not(.empty), .weekday-btn, #allowanceList button, .color-choice')) scheduleCalculatorDraftSave();
      }, true);
      updateDirtyUI();
    }


    function isTossInAppBrowser(){
      return /toss/i.test(navigator.userAgent || '');
    }

    function openExternalUrl(url){
      if(!url) return false;
      if(isTossInAppBrowser()){
        location.href = url;
        return false;
      }
      try {
        const popup = window.open(url, '_blank', 'noopener,noreferrer');
        if(popup) return false;
      } catch(e) {}
      location.href = url;
      return false;
    }

    function openKakaoPayDonation(){
      return openExternalUrl('https://qr.kakaopay.com/FdgGayRHw');
    }

    function setStepOpen(sectionId, shouldOpen){
      const section = document.getElementById(sectionId);
      if(!section) return;
      section.classList.toggle('step-open', !!shouldOpen);
      section.classList.toggle('step-collapsed', !shouldOpen);
      section.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
      updateStepToggleLabel(section);
      scheduleCalculatorDraftSave();
    }

    function openStepSection(sectionId, options){
      setStepOpen(sectionId, true);
      if(options && options.scroll){
        const section = document.getElementById(sectionId);
        if(section) section.scrollIntoView({ behavior:'smooth', block:'start' });
      }
    }

    function toggleStepSection(sectionId){
      const section = document.getElementById(sectionId);
      if(!section) return false;
      if(section.classList.contains('step-locked')) markStepUnlocked(sectionId);
      setStepOpen(sectionId, !section.classList.contains('step-open'));
      return false;
    }

    function updateStepToggleLabel(section){
      if(!section) return;
      const label = section.querySelector('.step-arrow');
      if(!label) return;
      if(section.classList.contains('step-completed')){
        label.textContent = '수정하기';
      } else if(section.classList.contains('step-open')){
        label.textContent = '접기';
      } else if(section.classList.contains('step-locked')){
        label.textContent = '다음';
      } else {
        label.textContent = '입력하기';
      }
    }

    function markStepUnlocked(sectionId){
      const section = document.getElementById(sectionId);
      if(!section) return;
      section.classList.remove('step-locked');
      section.classList.add('step-unlocked');
      updateStepToggleLabel(section);
    }

    function completeStep(currentSectionId, nextSectionId){
      if(currentSectionId){
        const current = document.getElementById(currentSectionId);
        if(current){
          current.classList.add('step-completed');
          current.classList.remove('step-locked');
          current.classList.add('step-unlocked');
          setStepOpen(currentSectionId, false);
          updateStepToggleLabel(current);
        }
      }
      if(nextSectionId){
        markStepUnlocked(nextSectionId);
        openStepSection(nextSectionId, { scroll:true });
      }
      return false;
    }

    function initStepFlow(){
      const ids = ['basicSection','workCalendarSection','allowanceSection','legalOptionSection'];
      ids.forEach(function(id, index){
        const section = document.getElementById(id);
        if(section){
          section.classList.remove('step-open','step-completed','step-unlocked','step-locked');
          if(index === 0){
            section.classList.add('step-unlocked');
          } else {
            section.classList.add('step-locked');
          }
        }
        setStepOpen(id, false);
        const header = document.querySelector('#' + id + ' .step-toggle');
        if(header && !header.dataset.stepKeyBound){
          header.dataset.stepKeyBound = '1';
          header.addEventListener('keydown', function(e){
            if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); toggleStepSection(id); }
          });
        }
      });
    }

    function normalizeStepCardsAfterCalculation(){
      ['basicSection','workCalendarSection','allowanceSection','legalOptionSection'].forEach(function(id){
        const section = document.getElementById(id);
        if(!section) return;
        section.classList.remove('step-locked');
        section.classList.add('step-unlocked');
        updateStepToggleLabel(section);
      });
    }

    function isDifferentFromDefaultWorkTime(rec){
      if(!rec) return false;
      const start = document.getElementById('defaultStartTime')?.value || '';
      const end = document.getElementById('defaultEndTime')?.value || '';
      const breakMinutes = Number(document.getElementById('defaultBreakHours')?.value || 0);
      return rec.startTime !== start || rec.endTime !== end || breakHoursToMinutes(rec.breakHours) !== breakMinutes;
    }

    function getCalendarDateState(dateKey, activeAllowanceId){
      const p = dateKey.split('-');
      const date = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
      const rec = workRecords[dateKey] || null;
      const holidayInfo = getHolidayInfo(dateKey);
      const dayAllowances = getAllowancesForDate(dateKey);
      const activeAllowance = activeAllowanceId ? allowances.find(a => a.id === activeAllowanceId) : null;
      const nightHours = rec ? calculateNightHours(rec.startTime, rec.endTime, rec.breakHours) : 0;
      return {
        dateKey,
        date,
        rec,
        hasWork: Boolean(rec),
        isSunday: date.getDay() === 0,
        isSaturday: date.getDay() === 6,
        isSelectedDate: dateKey === selectedDateKey,
        holidayInfo,
        holidayName: holidayInfo ? holidayInfo.name : '',
        isSubstituteHoliday: Boolean(holidayInfo && holidayInfo.type === 'substitute'),
        dayAllowances,
        hasAllowance: dayAllowances.length > 0,
        activeAllowanceSelected: Boolean(activeAllowance && (activeAllowance.dates || []).includes(dateKey)),
        nightHours,
        hasNight: nightHours > 0,
        overnight: rec ? isOvernight(rec.startTime, rec.endTime) : false,
        patternColor: rec ? getRecordPatternColor(rec) : '',
        differentFromDefault: isDifferentFromDefaultWorkTime(rec)
      };
    }

    function getCalendarDateClasses(state, baseClass){
      const classes = [baseClass];
      if(!state.hasWork) classes.push('no-work');
      if(state.isSunday) classes.push('sunday');
      if(state.isSaturday) classes.push('saturday');
      if(state.holidayName) classes.push('holiday');
      if(state.isSubstituteHoliday) classes.push('substitute-holiday');
      if(state.hasWork) classes.push('active-work', 'pattern-work');
      if(state.isSelectedDate) classes.push('selected');
      if(state.hasAllowance) classes.push('has-allowance');
      if(state.hasNight) classes.push('has-night');
      if(state.differentFromDefault) classes.push('different-work-time');
      if(state.activeAllowanceSelected) classes.push('allowance-picked');
      return classes;
    }

    function applyCalendarDateStyle(el, state, alpha){
      if(!el || !state.hasWork || !state.patternColor) return;
      el.style.setProperty('--pattern-bg', hexToRgba(state.patternColor, alpha || 0.14));
      el.style.setProperty('--pattern-border', hexToRgba(state.patternColor, 0.75));
    }

    function renderCalendarHolidayBadge(state, compact){
      if(!state.holidayName) return '';
      const label = getHolidayDisplayLabel(state.holidayInfo, compact);
      return '<div class="holiday-badge ' + (state.isSubstituteHoliday ? 'substitute-badge' : '') + '" title="' + escapeHtml(state.holidayName) + '">' + escapeHtml(label) + '</div>';
    }

    function getHolidayDisplayLabel(info, compact){
      if(!info) return '';
      if(info.type === 'substitute') return '\uB300\uCCB4';
      const name = info.name || '';
      if(name === '\uC804\uAD6D\uB3D9\uC2DC\uC9C0\uBC29\uC120\uAC70\uC77C') return '\uC9C0\uBC29\uC120\uAC70';
      if(name === '\uBD80\uCC98\uB2D8\uC624\uC2E0\uB0A0') return compact ? '\uBD80\uCC98\uB2D8' : '\uBD80\uCC98\uB2D8\uC624\uC2E0\uB0A0';
      return compact ? name.replace(/\s*\uC5F0\uD734$/, '') : name;
    }

    function renderAllowanceDots(state, maxCount){
      if(!state.dayAllowances.length) return '';
      const visible = state.dayAllowances.slice(0, maxCount || state.dayAllowances.length);
      const more = state.dayAllowances.length - visible.length;
      return '<div class="allowance-dots">' + visible.map(a => '<span class="color-dot" title="' + escapeHtml(a.name) + '" style="--dot-color:' + a.color + '"></span>').join('') + (more > 0 ? '<span class="allowance-more-dot">+' + more + '</span>' : '') + '</div>';
    }

    function renderCalendarStatusChips(state, compact){
      let chips = '';
      if(state.overnight && !compact) chips += '<span class="day-icon text-day-chip" aria-label="다음날 퇴근">다음날</span>';
      if(state.hasNight) chips += '<span class="day-icon text-day-chip" aria-label="야간 시간 포함">야간</span>';
      if(state.differentFromDefault) chips += '<span class="day-icon text-day-chip" aria-label="기본 근무시간과 다름">변경</span>';
      return chips ? '<div class="icon-row">' + chips + '</div>' : '';
    }

    function renderCalendar(){
      const ym = getCurrentYearMonth();
      const year = ym.year, month = ym.month;
      const calendar = document.getElementById('calendar');
      calendar.innerHTML = '';
      document.body.classList.toggle('pc-detail-hover', detailViewMode && !isMobileView());
      document.getElementById('modeText').textContent = detailViewMode ? '상세 확인 모드 · 근무일 클릭/터치 → 팝업 확인/수정' : '근무 입력 모드 · 시간을 적고 날짜를 누르면 등록';
      const titleEl = document.getElementById('mainCalendarTitle');
      if(titleEl) titleEl.innerHTML = year + '년 ' + month + '월 <small>근무 달력</small>';
      updateCalendarBuildButton();

      if(!year || month < 1 || month > 12){ alert('연도와 월을 정확히 입력해주세요.'); return; }
      const firstDay = new Date(year, month - 1, 1).getDay();
      const lastDate = new Date(year, month, 0).getDate();

      for(let i=0; i<firstDay; i++){
        const empty = document.createElement('div');
        empty.className = 'day empty';
        calendar.appendChild(empty);
      }

      for(let day=1; day<=lastDate; day++){
        const dateKey = getDateKey(year, month, day);
        const state = getCalendarDateState(dateKey);
        const hasWork = state.hasWork;
        const holidayName = state.holidayName;
        const relatedAllowances = state.dayAllowances;
        const night = state.nightHours;
        const dayBox = document.createElement('div');
        dayBox.className = getCalendarDateClasses(state, 'day').filter(c => c !== 'no-work').join(' ');
        applyCalendarDateStyle(dayBox, state, 0.14);

        let html = '<div class="day-number">' + day + '</div>';
        html += renderCalendarHolidayBadge(state, isMobileView());
        if(hasWork){
          const rec = state.rec;
          html += '<div class="work-summary">' + rec.startTime + '~' + rec.endTime + '</div>';
          let icons = '';
          if(isOvernight(rec.startTime, rec.endTime)) icons += '<span class="day-icon text-day-chip" aria-label="다음날 퇴근">다음날</span>';
          if(night > 0) icons += '<span class="day-icon text-day-chip" aria-label="야간 시간 포함">야간</span>';
          if(state.differentFromDefault) icons += '<span class="day-icon text-day-chip" aria-label="기본 근무시간과 다름">변경</span>';
          if(icons) html += '<div class="icon-row">' + icons + '</div>';
        }
        if(relatedAllowances.length > 0){
          const visibleAllowances = isMobileView() ? relatedAllowances.slice(0, 5) : relatedAllowances;
          const moreAllowanceCount = relatedAllowances.length - visibleAllowances.length;
          html += '<div class="allowance-dots">' + visibleAllowances.map(a => '<span class="color-dot" title="' + escapeHtml(a.name) + '" style="--dot-color:' + a.color + '"></span>').join('') + (moreAllowanceCount > 0 ? '<span class="allowance-more-dot">+' + moreAllowanceCount + '</span>' : '') + '</div>';
        }
        dayBox.innerHTML = html;
        dayBox.dataset.dateKey = dateKey;
        if(state.holidayName) dayBox.title = state.holidayName;
        dayBox.onclick = function(){ handleCalendarClick(dateKey, year, month, day); };
        if(hasWork){
          dayBox.onmouseenter = function(event){ showDayDetailTooltip(event, dateKey); };
          dayBox.onmousemove = function(event){ moveDayDetailTooltip(event); };
          dayBox.onmouseleave = function(){ hideDayDetailTooltip(); };
        }
        calendar.appendChild(dayBox);
      }
      renderSideMiniCalendar();
      renderMainCalendarLegend();
      renderMobileAllowanceLegend();
      updateDetailModeButton();
    }


    function renderMobileAllowanceLegend(){
      const box = document.getElementById('mobileAllowanceLegend');
      if(!box) return;
      const ym = getCurrentYearMonth();
      const prefix = ym.year + '-' + pad(ym.month) + '-';
      const allowanceMap = {};
      allowances.forEach(a => {
        const hasThisMonth = (a.dates || []).some(d => d.startsWith(prefix));
        if(hasThisMonth) allowanceMap[a.name] = a.color;
      });
      const items = Object.keys(allowanceMap).map(name => '<span class="mobile-allowance-item"><span class="color-dot" style="--dot-color:' + allowanceMap[name] + '"></span>' + escapeHtml(name) + '</span>').join('');
      box.innerHTML = '<div class="mobile-allowance-legend-title">추가수당 표시</div><div class="mobile-allowance-legend-items">' + (items || '<span class="muted">추가수당이 적용된 날짜에는 작은 원이 표시돼요.</span>') + '</div>';
    }

    function renderSideMiniCalendar(){
      const wrap = document.getElementById('sideMiniCalendarWrap');
      if(!wrap) return;
      const ym = getCurrentYearMonth();
      const year = ym.year, month = ym.month;
      if(!year || month < 1 || month > 12){ wrap.innerHTML = ''; return; }
      const firstDay = new Date(year, month - 1, 1).getDay();
      const lastDate = new Date(year, month, 0).getDate();
      let html = '<div class="side-mini-title"><span>' + year + '년 ' + month + '월 미니 달력</span><span class="muted">근무일 조회용</span></div>';
      html += '<div class="side-mini-calendar"><div class="side-mini-weekday">일</div><div class="side-mini-weekday">월</div><div class="side-mini-weekday">화</div><div class="side-mini-weekday">수</div><div class="side-mini-weekday">목</div><div class="side-mini-weekday">금</div><div class="side-mini-weekday">토</div>';
      for(let i=0; i<firstDay; i++) html += '<div class="side-mini-day empty"></div>';
      for(let day=1; day<=lastDate; day++){
        const date = new Date(year, month - 1, day);
        const dateKey = getDateKey(year, month, day);
        const state = getCalendarDateState(dateKey);
        const hasWork = state.hasWork;
        const rec = workRecords[dateKey];
        const holidayName = state.holidayName;
        const relatedAllowances = state.dayAllowances;
        const classes = ['side-mini-day'];
        let miniStyle = '';
        if(hasWork){
          classes.push('work');
          const pc = getRecordPatternColor(rec);
          miniStyle = ' style="--mini-work-bg:' + hexToRgba(pc, 0.16) + ';--mini-work-border:' + hexToRgba(pc, 0.75) + '"';
        }
        if(dateKey === selectedDateKey) classes.push('selected');
        if(date.getDay() === 0 || holidayName) classes.push('holiday');
        if(state.isSubstituteHoliday) classes.push('substitute-holiday');
        if(date.getDay() === 6) classes.push('saturday');
        const miniDots = relatedAllowances.length ? '<span class="side-mini-dots">' + relatedAllowances.slice(0,3).map(a => '<span class="side-mini-dot" style="--dot-color:' + a.color + '"></span>').join('') + '</span>' : '';
        html += '<button type="button" class="' + classes.join(' ') + '"' + miniStyle + ' title="' + (hasWork ? '근무 상세보기' : '근무일 아님 · 조회만 가능') + '" ' + (hasWork ? 'onclick="handleSideMiniDateClick(\'' + dateKey + '\',' + year + ',' + month + ',' + day + ')"' : 'aria-disabled="true"') + '>' + day + miniDots + '</button>';
      }
      html += '</div>';
      wrap.innerHTML = html;
    }

    function handleSideMiniDateClick(dateKey, year, month, day){
      if(!workRecords[dateKey]){
        alert('미니 달력은 조회용이라 근무일을 새로 만들지 않아요. 근무일 추가는 위 큰 달력에서 해주세요.');
        return;
      }
      if(!detailToggleTouched && !selectedDetailOpen){
        selectedDetailOpen = true;
      }
      selectDay(dateKey, year, month, day, selectedDetailOpen);
      renderCalendar();
      renderAllowanceList();
    }


    function handleCalendarClick(dateKey, year, month, day){
      if(detailViewMode){
        if(!workRecords[dateKey]){
          alert('상세 확인 모드에서는 이미 선택된 근무일만 확인할 수 있어요. 근무일을 추가하려면 “근무 입력으로 돌아가기”를 눌러주세요.');
          return;
        }
        const sheet = document.getElementById('mobileDaySheet');
        if(sheet && sheet.classList.contains('show') && selectedDateKey === dateKey){
          closeMobileDaySheet();
          selectedDateKey = null;
          renderCalendar();
          renderAllowanceList();
          return;
        }
        selectedDateKey = dateKey;
        showMobileDaySheet(dateKey);
        renderCalendar();
        renderAllowanceList();
        return;
      }

      if(workRecords[dateKey]){
        deleteWorkDay(dateKey);
        return;
      }

      markDirty();
      workRecords[dateKey] = createDefaultRecord();
      selectedDateKey = dateKey;
      selectedDetailOpen = false;
      closeEditPanel();
      renderCalendar();
      renderAllowanceList();
    }

    function getScheduleSignature(startTime, endTime, breakHours){
      return startTime + '|' + endTime + '|' + breakHoursToMinutes(breakHours);
    }

    function getScheduleColor(startTime, endTime, breakHours){
      const sig = getScheduleSignature(startTime, endTime, breakHours);
      if(scheduleColorMap[sig]) return scheduleColorMap[sig];

      const usedColors = new Set();
      Object.keys(workRecords || {}).sort().forEach(key => {
        const rec = workRecords[key];
        if(!rec) return;
        const recSig = getScheduleSignature(rec.startTime, rec.endTime, rec.breakHours);
        if(recSig === sig && rec.patternColor) scheduleColorMap[sig] = rec.patternColor;
        if(rec.patternColor) usedColors.add(rec.patternColor);
      });
      if(scheduleColorMap[sig]) return scheduleColorMap[sig];

      const sigs = Object.keys(scheduleColorMap).sort();
      let color = manualScheduleColors[sigs.length % manualScheduleColors.length];
      for(let i=0; i<manualScheduleColors.length; i++){
        const candidate = manualScheduleColors[(sigs.length + i) % manualScheduleColors.length];
        if(!usedColors.has(candidate)){ color = candidate; break; }
      }
      scheduleColorMap[sig] = color;
      return color;
    }

    function createDefaultRecord(){
      const startTime = document.getElementById('defaultStartTime').value;
      const endTime = document.getElementById('defaultEndTime').value;
      if(!isValidTimeText(startTime) || !isValidTimeText(endTime)){ alert('출근/퇴근 시간은 00:00~23:59 형식으로 입력해주세요.'); return { startTime:'00:00', endTime:'00:00', breakHours:0, realHours:0, patternId:null, patternName:'입력 오류', patternColor:'#64748b' }; }
      const breakHours = minutesToBreakHours(document.getElementById('defaultBreakHours').value);
      const realHours = calculateRealHours(startTime, endTime, breakHours);
      const color = getScheduleColor(startTime, endTime, breakHours);
      return { startTime, endTime, breakHours, realHours:Number(realHours.toFixed(2)), patternId:null, patternName:startTime + '–' + endTime + ' 근무', patternColor:color };
    }

    function updateDetailModeButton(){
      const btn = document.getElementById('detailModeBtn');
      if(!btn) return;
      btn.textContent = detailViewMode ? '근무 입력 모드로 돌아가기' : '상세 확인 모드 켜기';
      btn.classList.toggle('active', detailViewMode);
    }

    function buildDayDetailTooltipHtml(dateKey){
      const rec = workRecords[dateKey];
      if(!rec) return '';
      const hourlyWage = Number(document.getElementById('hourlyWage').value) || 0;
      const night = calculateNightHours(rec.startTime, rec.endTime, rec.breakHours);
      const dailyOver = Math.max(rec.realHours - 8, 0);
      const holidayLabel = getHolidayLabel(dateKey);
      const dayAllowances = getAllowancesForDate(dateKey);
      const allowanceMoney = calculateAllowanceTotalForDate(dateKey);
      const base = rec.realHours * hourlyWage;
      const nightExtra = document.getElementById('nightOption').checked ? night * hourlyWage * 0.5 : 0;
      const overExtra = document.getElementById('overtimeOption').checked ? dailyOver * hourlyWage * 0.5 : 0;
      const holidayExtra = getHolidayExtraForDay(dateKey, rec.realHours, hourlyWage);
      const dayTotal = base + nightExtra + overExtra + holidayExtra + allowanceMoney;
      const allowanceText = dayAllowances.length ? dayAllowances.map(a => escapeHtml(a.name)).join(', ') : '없음';
      function item(label, value, extraClass){
        return '<div class="tip-item ' + (extraClass || '') + '"><span class="detail-label">' + label + '</span><b class="detail-value">' + value + '</b></div>';
      }
      return '<strong>' + dateKey + ' 상세정보</strong><div class="tip-grid">'
        + item('근무시간', rec.startTime + '–' + rec.endTime)
        + item('휴게시간', formatBreakTime(rec.breakHours))
        + item('실근무', rec.realHours.toFixed(1) + '시간')
        + item('기본급', Math.round(base).toLocaleString() + '원')
        + item('연장 / 야간', dailyOver.toFixed(1) + 'h / ' + night.toFixed(1) + 'h')
        + item('가산수당', Math.round(overExtra + nightExtra + holidayExtra).toLocaleString() + '원')
        + item('휴일구분', escapeHtml(holidayLabel))
        + item('추가수당', Math.round(allowanceMoney).toLocaleString() + '원')
        + item('수당명', allowanceText)
        + item('일 합계', Math.round(dayTotal).toLocaleString() + '원', 'total')
        + '</div><div class="tip-note">날짜를 클릭하면 상세 팝업에서 근무시간을 바로 수정할 수 있어요.</div>';
    }
    function showDayDetailTooltip(event, dateKey){
      if(!detailViewMode || isMobileView() || !workRecords[dateKey]) return;
      const tip = document.getElementById('dayDetailTooltip');
      if(!tip) return;
      tip.innerHTML = buildDayDetailTooltipHtml(dateKey);
      tip.classList.add('show');
      moveDayDetailTooltip(event);
    }
    function moveDayDetailTooltip(event){
      const tip = document.getElementById('dayDetailTooltip');
      if(!tip || !tip.classList.contains('show')) return;
      const x = event ? event.clientX : window.innerWidth / 2;
      const y = event ? event.clientY : 160;
      const rect = tip.getBoundingClientRect();
      let left = x + 14;
      let top = y + 14;
      if(left + rect.width > window.innerWidth - 12) left = x - rect.width - 14;
      if(top + rect.height > window.innerHeight - 12) top = window.innerHeight - rect.height - 12;
      tip.style.left = Math.max(12, left) + 'px';
      tip.style.top = Math.max(12, top) + 'px';
    }
    function hideDayDetailTooltip(){
      const tip = document.getElementById('dayDetailTooltip');
      if(tip){
        tip.classList.remove('show');
        tip.style.left = '-9999px';
        tip.style.top = '-9999px';
      }
    }

    function isPointerOnTooltipDay(target){
      if(!target || !target.closest) return false;
      const day = target.closest('.day');
      return Boolean(day && !day.classList.contains('empty') && day.dataset && day.dataset.dateKey && workRecords[day.dataset.dateKey]);
    }

    function installDayTooltipAutoHide(){
      document.addEventListener('mouseover', function(event){
        if(!detailViewMode || isMobileView()) return;
        if(!isPointerOnTooltipDay(event.target)) hideDayDetailTooltip();
      }, true);
      document.addEventListener('mousemove', function(event){
        if(!detailViewMode || isMobileView()) return;
        if(!isPointerOnTooltipDay(event.target)) hideDayDetailTooltip();
      }, true);
      document.addEventListener('click', function(event){
        if(!isPointerOnTooltipDay(event.target)) hideDayDetailTooltip();
      }, true);
      window.addEventListener('scroll', hideDayDetailTooltip, true);
    }


    function showMobileDaySheet(dateKey){
      if(!workRecords[dateKey]) return;
      selectedDateKey = dateKey;
      const sheet = document.getElementById('mobileDaySheet');
      const backdrop = document.getElementById('mobileDaySheetBackdrop');
      const title = document.getElementById('mobileDaySheetTitle');
      const body = document.getElementById('mobileDaySheetBody');
      if(!sheet || !backdrop || !title || !body) return;
      const parts = dateKey.split('-').map(Number);
      title.textContent = parts[0] + '년 ' + parts[1] + '월 ' + parts[2] + '일 상세정보';
      body.innerHTML = buildMobileDaySheetHtml(dateKey);
      backdrop.classList.add('show');
      sheet.classList.add('show');
      document.body.style.overflow = 'hidden';
      scheduleCalculatorDraftSave();
    }

    function closeMobileDaySheet(){
      const sheet = document.getElementById('mobileDaySheet');
      const backdrop = document.getElementById('mobileDaySheetBackdrop');
      if(sheet) sheet.classList.remove('show');
      if(backdrop) backdrop.classList.remove('show');
      document.body.style.overflow = '';
      scheduleCalculatorDraftSave();
    }

    function editDayFromMobileSheet(dateKey){
      const body = document.getElementById('mobileDaySheetBody');
      if(!body || !workRecords[dateKey]) return;
      body.innerHTML = buildMobileDayEditHtml(dateKey);
      setTimeout(function(){
        const first = document.getElementById('mobileSheetStartTime');
        if(first) first.focus();
      }, 50);
    }

    function buildMobileDayEditHtml(dateKey){
      const rec = workRecords[dateKey];
      return '<div class="mobile-sheet-edit-form">'
        + '<p class="mobile-sheet-edit-note">이 날짜만 수정됩니다. 저장하면 달력 색상과 급여 계산값도 바로 다시 반영돼요.</p>'
        + '<div class="time-entry-grid">'
        + '<div class="time-grid">'
        + '<label for="mobileSheetStartTime">출근 <input class="time-input" type="text" id="mobileSheetStartTime" value="' + rec.startTime + '" placeholder="예: 11:00" inputmode="numeric" maxlength="5" onblur="normalizeTimeInput(this)" /></label>'
        + '<label for="mobileSheetEndTime">퇴근 <input class="time-input" type="text" id="mobileSheetEndTime" value="' + rec.endTime + '" placeholder="예: 21:00" inputmode="numeric" maxlength="5" onblur="normalizeTimeInput(this)" /></label>'
        + '</div>'
        + '<label class="break-input" for="mobileSheetBreakMinutes">휴게 <span class="input-with-unit"><input type="number" id="mobileSheetBreakMinutes" value="' + breakHoursToMinutes(rec.breakHours) + '" min="0" step="1" inputmode="numeric" /><span class="unit-label">분</span></span></label>'
        + '<div class="field-help">예: 1시간 = 60분, 1시간 15분 = 75분</div>'
        + '</div>'
        + '<div class="mobile-day-sheet-actions"><button type="button" class="soft-btn" onclick="saveMobileSheetEdit(&quot;' + dateKey + '&quot;)">수정 저장</button><button type="button" class="ghost-btn" onclick="showMobileDaySheet(&quot;' + dateKey + '&quot;)">취소</button></div>'
        + '</div>';
    }

    function saveMobileSheetEdit(dateKey){
      const startInput = document.getElementById('mobileSheetStartTime');
      const endInput = document.getElementById('mobileSheetEndTime');
      const breakInput = document.getElementById('mobileSheetBreakMinutes');
      if(!startInput || !endInput || !breakInput || !workRecords[dateKey]) return;
      normalizeTimeInput(startInput);
      normalizeTimeInput(endInput);
      const startTime = startInput.value;
      const endTime = endInput.value;
      if(!isValidTimeText(startTime) || !isValidTimeText(endTime)){
        alert('출근/퇴근 시간은 00:00~23:59 형식으로 입력해주세요.');
        return;
      }
      const breakHours = minutesToBreakHours(breakInput.value);
      const realHours = calculateRealHours(startTime, endTime, breakHours);
      if(realHours < 0){ alert('휴게시간이 총 근무시간보다 길 수 없어요.'); return; }
      const old = workRecords[dateKey] || {};
      const color = getScheduleColor(startTime, endTime, breakHours);
      workRecords[dateKey] = Object.assign({}, old, {
        startTime: startTime,
        endTime: endTime,
        breakHours: breakHours,
        realHours: Number(realHours.toFixed(2)),
        patternId: null,
        patternName: startTime + '–' + endTime + ' 근무',
        patternColor: color
      });
      selectedDateKey = dateKey;
      calculateMonthlyPay();
      renderCalendar();
      renderAllowanceList();
      showMobileDaySheet(dateKey);
    }

    function buildMobileDaySheetHtml(dateKey){
      const baseHtml = buildDayDetailTooltipHtml(dateKey)
        .replace('<strong>' + dateKey + ' 상세정보</strong>', '')
        .replace('날짜를 클릭하면 상세 팝업에서 근무시간을 바로 수정할 수 있어요.', '아래 수정 버튼을 누르면 이 날짜 근무시간을 팝업 안에서 바로 바꿀 수 있어요.');
      return baseHtml + '<div class="mobile-day-sheet-actions"><button type="button" class="soft-btn" onclick="editDayFromMobileSheet(&quot;' + dateKey + '&quot;)">근무시간 수정</button><button type="button" class="ghost-btn" onclick="closeMobileDaySheet()">닫기</button></div>';
    }

    function toggleDetailViewMode(){
      detailViewMode = !detailViewMode;
      document.body.classList.toggle('pc-detail-hover', detailViewMode && !isMobileView());
      hideDayDetailTooltip();
      closeMobileDaySheet();
      if(detailViewMode && !isMobileView()) closeEditPanel();
      updateDetailModeButton();
      renderCalendar();
      scheduleCalculatorDraftSave();
    }

    function selectDay(dateKey, year, month, day, showDetails=false){
      selectedDateKey = dateKey;
      if(isMobileView()) selectedDetailOpen = Boolean(showDetails);
      else if(showDetails) selectedDetailOpen = true;
      const rec = workRecords[dateKey];
      document.getElementById('selectedDayTitle').textContent = year + '년 ' + month + '월 ' + day + '일 근무 상세정보';
      document.getElementById('startTime').value = rec.startTime;
      document.getElementById('endTime').value = rec.endTime;
      document.getElementById('breakHours').value = breakHoursToMinutes(rec.breakHours);
      document.getElementById('editPanel').classList.add('show');
      updateOvernightNotice(rec);
      updateSelectedDayDetails();
      renderSideMiniCalendar();
      scheduleCalculatorDraftSave();
    }

    function closeEditPanel(){ document.getElementById('editPanel').classList.remove('show'); selectedDetailOpen = false; detailToggleTouched = false; updateSelectedDayDetails(); scheduleCalculatorDraftSave(); }

    function addWeekday(weekday){
      const ym = getCurrentYearMonth();
      const year = ym.year, month = ym.month;
      const lastDate = new Date(year, month, 0).getDate();
      const keys = [];
      for(let day=1; day<=lastDate; day++){
        const date = new Date(year, month - 1, day);
        if(date.getDay() === weekday) keys.push(getDateKey(year, month, day));
      }
      const allAlreadyAdded = keys.length > 0 && keys.every(k => Boolean(workRecords[k]));
      if(keys.length > 0) markDirty();
      keys.forEach(k => {
        if(allAlreadyAdded) deleteWorkDay(k, false);
        else workRecords[k] = createDefaultRecord();
      });
      if(allAlreadyAdded){ selectedDateKey = null; closeEditPanel(); }
      renderCalendar();
      renderAllowanceList();
    }

    function clearCurrentMonth(){
      const ym = getCurrentYearMonth();
      const prefix = ym.year + '-' + pad(ym.month) + '-';
      const count = Object.keys(workRecords).filter(k => k.startsWith(prefix)).length;
      if(count === 0){ alert('이번 달에 선택된 근무일이 없어요.'); return; }
      if(!confirm('이번 달 메인 달력에서 선택한 근무일을 전부 취소할까요? 추가수당 적용 날짜도 같이 정리됩니다.')) return;
      markDirty();
      Object.keys(workRecords).forEach(k => { if(k.startsWith(prefix)) deleteWorkDay(k, false); });
      allowances.forEach(a => { a.dates = (a.dates || []).filter(d => !d.startsWith(prefix)); });
      selectedDateKey = null; closeEditPanel(); renderCalendar(); renderAllowanceList();
    }


    function toggleWeekdayFromHeader(weekday){ addWeekday(weekday); }

    function resetAllInputs(){
      if(!confirm('근무일, 추가수당, 계산 결과를 전부 초기화할까요?')) return;
      clearCalculatorDraft();
      draftClearedByUser = true;
      workRecords = {};
      scheduleColorMap = {};
      allowances = [];
      selectedDateKey = null;
      selectedDetailOpen = false;
      detailToggleTouched = false;
      lastCalculationRows = [];
      lastCalculationSummary = null;
      closeEditPanel();
      renderCalendar();
      renderAllowanceList();
      const result = document.getElementById('result');
      if(result) result.textContent = '계산 결과가 여기에 표시됩니다.';
      const state = document.getElementById('saveState');
      if(state) state.textContent = '전체 초기화 완료';
    }

    function isValidTimeText(t){ return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(t || '').trim()); }
    function normalizeTimeValue(value){
      let v = String(value || '').trim();
      if(/^\d{1,2}$/.test(v)) v = pad(Number(v)) + ':00';
      if(/^\d{3,4}$/.test(v)) v = pad(Number(v.slice(0, -2))) + ':' + v.slice(-2);
      if(/^\d{1,2}:\d{1,2}$/.test(v)){
        const parts = v.split(':');
        v = pad(Number(parts[0])) + ':' + pad(Number(parts[1]));
      }
      return isValidTimeText(v) ? v : '';
    }
    function normalizeTimeInput(input){
      let v = String(input.value || '').trim();
      if(/^\d{1,2}$/.test(v)) v = pad(Number(v)) + ':00';
      if(/^\d{3,4}$/.test(v)) v = pad(Number(v.slice(0, -2))) + ':' + v.slice(-2);
      if(/^\d{1,2}:\d{1,2}$/.test(v)){
        const parts = v.split(':');
        v = pad(Number(parts[0])) + ':' + pad(Number(parts[1]));
      }
      if(isValidTimeText(v)) input.value = v;
      else alert('시간은 00:00~23:59 형식으로 입력해주세요. 예: 22:00');
    }
    function timeToMinutes(t){
      if(!isValidTimeText(t)) return 0;
      const p = t.split(':'); return Number(p[0]) * 60 + Number(p[1]);
    }
    function minutesToBreakHours(minutes){ return Math.max(Number(minutes || 0), 0) / 60; }
    function breakHoursToMinutes(hours){ return Math.round(Math.max(Number(hours || 0), 0) * 60); }
    function formatBreakTime(hours){
      const totalMinutes = breakHoursToMinutes(hours);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      if(h > 0 && m > 0) return h + '시간 ' + m + '분';
      if(h > 0) return h + '시간';
      return m + '분';
    }
    function isOvernight(startTime, endTime){ return timeToMinutes(endTime) <= timeToMinutes(startTime); }
    function calculateRealHours(startTime, endTime, breakHours){
      let s = timeToMinutes(startTime), e = timeToMinutes(endTime);
      if(e <= s) e += 1440;
      return Math.max(((e - s) / 60) - Number(breakHours), 0);
    }
    function overlapMinutes(aStart, aEnd, bStart, bEnd){ return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart)); }
    function calculateNightHours(startTime, endTime, breakHours){
      let s = timeToMinutes(startTime), e = timeToMinutes(endTime);
      if(e <= s) e += 1440;
      let nightMin = 0;
      nightMin += overlapMinutes(s, e, 0, 360);
      nightMin += overlapMinutes(s, e, 1320, 1800);
      const rawHours = Math.max((e - s) / 60, 0);
      const realHours = calculateRealHours(startTime, endTime, breakHours);
      if(rawHours === 0) return 0;
      return Math.min((nightMin / 60) * (realHours / rawHours), realHours);
    }
    function updateOvernightNotice(rec){
      const box = document.getElementById('overnightNotice');
      if(!rec){ box.innerHTML = ''; return; }
      if(isOvernight(rec.startTime, rec.endTime)){
        box.innerHTML = '<span class="next-day-pill">다음날 퇴근으로 계산됨 · 총 ' + rec.realHours + '시간</span>';
      } else {
        box.innerHTML = '';
      }
    }
    function updateSelectedWorkDay(){
      if(!selectedDateKey || !workRecords[selectedDateKey]) return;
      const startTime = document.getElementById('startTime').value;
      const endTime = document.getElementById('endTime').value;
      if(!isValidTimeText(startTime) || !isValidTimeText(endTime)) return;
      const breakHours = minutesToBreakHours(document.getElementById('breakHours').value);
      const realHours = calculateRealHours(startTime, endTime, breakHours);
      const color = getScheduleColor(startTime, endTime, breakHours);
      markDirty();
      workRecords[selectedDateKey] = { startTime, endTime, breakHours, realHours:Number(realHours.toFixed(2)), patternId:null, patternName:startTime + '–' + endTime + ' 근무', patternColor:color };
      updateOvernightNotice(workRecords[selectedDateKey]);
      updateSelectedDayDetails();
      renderCalendar();
      renderAllowanceList();
    }
    function deleteWorkDay(dateKey, shouldRender=true){
      if(workRecords[dateKey]) markDirty();
      delete workRecords[dateKey];
      removeDeletedDateFromAllowances(dateKey);
      if(selectedDateKey === dateKey){ selectedDateKey = null; selectedDetailOpen = false; closeEditPanel(); }
      if(shouldRender){ renderCalendar(); renderAllowanceList(); }
    }
    function deleteSelectedWorkDay(){
      if(!selectedDateKey) return;
      deleteWorkDay(selectedDateKey);
    }
    function applyDefaultTimeToSelectedDay(){
      if(!selectedDateKey || !workRecords[selectedDateKey]) return;
      markDirty();
      workRecords[selectedDateKey] = createDefaultRecord();
      const p = selectedDateKey.split('-');
      selectDay(selectedDateKey, Number(p[0]), Number(p[1]), Number(p[2]));
      renderCalendar();
      renderAllowanceList();
    }

    function toggleSelectedDayDetails(){
      if(!selectedDateKey || !workRecords[selectedDateKey]) return;
      detailToggleTouched = true;
      selectedDetailOpen = !selectedDetailOpen;
      updateSelectedDayDetails();
    }
    function updateDetailToggleButton(){
      const btn = document.getElementById('detailToggleBtn');
      if(!btn) return;
      btn.textContent = selectedDetailOpen ? '접기' : '이 날짜 상세정보 보기';
    }
    function updateSelectedDayDetails(){
      const box = document.getElementById('selectedDayDetails');
      if(!box) return;
      updateDetailToggleButton();
      if(!selectedDetailOpen || !selectedDateKey || !workRecords[selectedDateKey]){ box.classList.remove('show'); box.innerHTML = ''; return; }
      const rec = workRecords[selectedDateKey];
      const hourlyWage = Number(document.getElementById('hourlyWage').value) || 0;
      const night = calculateNightHours(rec.startTime, rec.endTime, rec.breakHours);
      const dailyOver = Math.max(rec.realHours - 8, 0);
      const holidayApplied = isHoliday(selectedDateKey);
      const holidayLabel = getHolidayLabel(selectedDateKey);
      const dayAllowances = getAllowancesForDate(selectedDateKey);
      const allowanceText = dayAllowances.length ? dayAllowances.map(a => escapeHtml(a.name)).join(', ') : '없음';
      const allowanceMoney = calculateAllowanceTotalForDate(selectedDateKey);
      const base = rec.realHours * hourlyWage;
      const nightExtra = document.getElementById('nightOption').checked ? night * hourlyWage * 0.5 : 0;
      const overExtra = document.getElementById('overtimeOption').checked ? dailyOver * hourlyWage * 0.5 : 0;
      const holidayExtra = getHolidayExtraForDay(selectedDateKey, rec.realHours, hourlyWage);
      const dayTotal = base + nightExtra + overExtra + holidayExtra + allowanceMoney;
      const holidayTypeText = getSelectedHolidayApplyType() === 'publicOnly' ? '공휴일만 적용' : (getSelectedHolidayApplyType() === 'sundayAndPublic' ? '일요일도 적용' : '계산 안 함');
      box.classList.add('show');
      box.innerHTML = '<strong>선택한 날짜 상세정보</strong><div class="detail-grid" style="margin-top:10px;">'
        + '<div class="detail-item">실근무시간<strong>' + rec.realHours.toFixed(1) + '시간</strong></div>'
        + '<div class="detail-item">기본급 예상<strong>' + Math.round(base).toLocaleString() + '원</strong></div>'
        + '<div class="detail-item">22~06 포함 시간<strong>' + night.toFixed(1) + '시간</strong></div>'
        + '<div class="detail-item">일 8시간 초과<strong>' + dailyOver.toFixed(1) + '시간</strong></div>'
        + '<div class="detail-item">야간 가산 예상<strong>' + Math.round(nightExtra).toLocaleString() + '원</strong></div>'
        + '<div class="detail-item">연장 가산 예상<strong>' + Math.round(overExtra).toLocaleString() + '원</strong></div>'
        + '<div class="detail-item ' + (holidayApplied ? 'warn' : '') + '">휴일 구분<strong>' + escapeHtml(holidayLabel) + '</strong><span class="muted">' + holidayTypeText + '</span></div>'
        + '<div class="detail-item ' + (holidayExtra > 0 ? 'warn' : '') + '">휴일 가산 예상<strong>' + Math.round(holidayExtra).toLocaleString() + '원</strong></div>'
        + '<div class="detail-item">적용 추가수당<strong>' + allowanceText + '</strong></div>'
        + '<div class="detail-item">추가수당 금액<strong>' + Math.round(allowanceMoney).toLocaleString() + '원</strong></div>'
        + '<div class="detail-item good">이 날짜 예상 합계<strong>' + Math.round(dayTotal).toLocaleString() + '원</strong></div>'
        + '</div><div class="detail-note">일요일은 빨간색으로 보여도, 민간 사업장 휴일수당 계산에서는 보통 관공서 공휴일과 다르게 취급될 수 있어요. 그래서 기본값은 “공휴일/대체공휴일만 적용”으로 두었습니다.</div><p class="small-note">상세정보는 하루 기준 참고값입니다. 실제 월급은 아래 월급 계산 결과가 최종 합산값입니다.</p>';
    }

    function toggleAllowanceTypeFields(){
      const type = document.getElementById('allowanceType').value;
      const hourMode = document.getElementById('allowanceHourMode').value;
      document.getElementById('fixedAllowanceBox').classList.toggle('hidden', type !== 'fixed');
      document.getElementById('hourlyAllowanceBox').classList.toggle('hidden', type !== 'hourly');
      document.getElementById('hourlyModeBox').classList.toggle('hidden', type !== 'hourly');
      document.getElementById('manualHoursBox').classList.toggle('hidden', !(type === 'hourly' && hourMode === 'manual'));
    }
    function getNextAllowanceColor(){ return allowanceColors[allowances.length % allowanceColors.length].value; }
    function clearAllowanceForm(){
      document.getElementById('allowanceName').value = '';
      document.getElementById('allowanceType').value = 'fixed';
      document.getElementById('allowanceAmount').value = '';
      document.getElementById('allowanceHourlyRate').value = 2000;
      document.getElementById('allowanceHours').value = 1;
      document.getElementById('allowanceHourMode').value = 'manual';
      setAllowanceColor(getNextAllowanceColor());
      toggleAllowanceTypeFields();
    }
    function createAllowance(){
      const name = document.getElementById('allowanceName').value.trim();
      const type = document.getElementById('allowanceType').value;
      const color = document.getElementById('allowanceColor').value || getNextAllowanceColor();
      if(!name){ alert('수당 이름을 입력해주세요. 예: 식대'); return; }
      let allowance = { id:Date.now(), name, type, color, dates:[] };
      if(type === 'fixed'){
        const amount = Number(document.getElementById('allowanceAmount').value);
        if(!amount || amount <= 0){ alert('수당 금액을 입력해주세요.'); return; }
        allowance.amount = amount;
      } else {
        const hourlyRate = Number(document.getElementById('allowanceHourlyRate').value);
        const hourMode = document.getElementById('allowanceHourMode').value;
        const hours = Number(document.getElementById('allowanceHours').value);
        if(!hourlyRate || hourlyRate <= 0){ alert('시간당 수당 금액을 입력해주세요.'); return; }
        if(hourMode === 'manual' && (!hours || hours <= 0)){ alert('적용 시간을 입력해주세요.'); return; }
        allowance.hourlyRate = hourlyRate;
        allowance.hourMode = hourMode;
        allowance.hours = hourMode === 'manual' ? hours : 0;
      }
      allowances.push(allowance);
      activeAllowancePickerId = allowance.id;
      document.getElementById('allowanceName').value = '';
      setAllowanceColor(getNextAllowanceColor());
      renderAllowanceList();
      renderCalendar();
      setTimeout(function(){
        activeAllowancePickerId = allowance.id;
        renderAllowanceList();
      }, 0);
    }
    function deleteAllowance(id){ if(activeAllowancePickerId === id) activeAllowancePickerId = null; allowances = allowances.filter(a => a.id !== id); renderAllowanceList(); renderCalendar(); }
    function toggleAllowanceDate(id, dateKey){
      const a = allowances.find(item => item.id === id);
      if(!a) return;
      if(a.dates.includes(dateKey)) a.dates = a.dates.filter(d => d !== dateKey);
      else a.dates.push(dateKey);
      a.dates.sort();
      renderAllowanceList();
      renderCalendar();
    }
    function selectAllDatesForAllowance(id){
      const a = allowances.find(item => item.id === id);
      if(!a) return;
      a.dates = Object.keys(workRecords).sort();
      renderAllowanceList();
      renderCalendar();
    }
    function clearDatesForAllowance(id){
      const a = allowances.find(item => item.id === id);
      if(!a) return;
      a.dates = [];
      renderAllowanceList();
      renderCalendar();
    }
    function getAllowancesForDate(dateKey){ return allowances.filter(a => a.dates.includes(dateKey)); }
    function removeDeletedDateFromAllowances(dateKey){ allowances.forEach(a => a.dates = a.dates.filter(d => d !== dateKey)); }
    function calculateAllowanceAmount(a){
      if(a.type === 'fixed') return (a.amount || 0) * a.dates.length;
      let total = 0;
      a.dates.forEach(dateKey => {
        const rec = workRecords[dateKey];
        const hours = a.hourMode === 'workHours' && rec ? rec.realHours : a.hours;
        total += (a.hourlyRate || 0) * (hours || 0);
      });
      return total;
    }
    function calculateAllowanceTotalForDate(dateKey){
      return allowances.reduce((sum, a) => {
        if(!a.dates.includes(dateKey)) return sum;
        if(a.type === 'hourly'){
          const rec = workRecords[dateKey];
          const hours = a.hourMode === 'workHours' && rec ? rec.realHours : a.hours;
          return sum + (a.hourlyRate || 0) * (hours || 0);
        }
        return sum + (a.amount || 0);
      }, 0);
    }
    function calculateAllowanceTotal(){ return allowances.reduce((sum, a) => sum + calculateAllowanceAmount(a), 0); }
    function openAllowancePicker(event, id){
      if(event) event.stopPropagation();
      activeAllowancePickerId = activeAllowancePickerId === id ? null : id;
      renderAllowanceList();
    }
    function buildDatePickerHtml(a){
      const ym = getCurrentYearMonth();
      const year = ym.year, month = ym.month;
      const firstDay = new Date(year, month - 1, 1).getDay();
      const lastDate = new Date(year, month, 0).getDate();
      let html = '<div class="date-picker-box"><strong>적용 날짜 선택</strong><p class="small-note">아래 달력에서 이 수당을 받을 근무일을 눌러주세요. 다시 누르면 그 날짜만 해제됩니다.</p>';
      html += '<div class="mini-calendar"><div class="mini-weekday">일</div><div class="mini-weekday">월</div><div class="mini-weekday">화</div><div class="mini-weekday">수</div><div class="mini-weekday">목</div><div class="mini-weekday">금</div><div class="mini-weekday">토</div>';
      for(let i=0; i<firstDay; i++) html += '<div class="mini-day empty"></div>';
      for(let day=1; day<=lastDate; day++){
        const dateKey = getDateKey(year, month, day);
        const state = getCalendarDateState(dateKey, a.id);
        const classes = getCalendarDateClasses(state, 'mini-day');
        const action = state.hasWork ? 'onclick="toggleAllowanceDate(' + a.id + ', \' ' + dateKey + '\'.trim())"' : 'disabled title="먼저 근무일로 추가하세요"';
        const style = state.hasWork ? ' style="--pattern-bg:' + hexToRgba(state.patternColor, 0.14) + ';--pattern-border:' + hexToRgba(state.patternColor, 0.75) + ';--dot-color:' + a.color + '"' : '';
        let content = '<span class="mini-day-number">' + day + '</span>';
        content += renderCalendarHolidayBadge(state, true);
        if(state.hasWork) content += renderCalendarStatusChips(state, true);
        content += renderAllowanceDots(state, 3);
        html += '<button type="button" class="' + classes.join(' ') + '" ' + action + style + '>' + content + '</button>';
      }
      html += '</div><div class="two-grid" style="margin-top:10px;"><button class="soft-btn" onclick="selectAllDatesForAllowance(' + a.id + ')">근무일 전체 적용</button><button class="danger-btn" onclick="clearDatesForAllowance(' + a.id + ')">이 수당 날짜 전체 해제</button></div></div>';
      return html;
    }
    function renderAllowanceList(){
      const box = document.getElementById('allowanceList');
      if(allowances.length === 0){ box.innerHTML = '<div class="muted">아직 추가 수당이 없습니다. 수당을 추가하면 날짜 선택 달력이 바로 열립니다. 근무일을 눌러 수당 적용 날짜를 고르세요.</div>'; return; }
      box.innerHTML = allowances.map(a => {
        const amountText = a.type === 'fixed'
          ? (a.amount || 0).toLocaleString() + '원 × ' + a.dates.length + '일'
          : (a.hourlyRate || 0).toLocaleString() + '원/시간 × ' + (a.hourMode === 'workHours' ? '실근무시간 전체' : (a.hours || 0) + '시간') + ' × ' + a.dates.length + '일';
        const isOpen = activeAllowancePickerId === a.id;
        const picker = isOpen ? buildDatePickerHtml(a) : '';
        const btnText = isOpen ? '날짜 선택 접기' : '날짜 고르기';
        return '<div class="allowance-card' + (isOpen ? ' open' : '') + '" onclick="event.stopPropagation()">'
          + '<div class="allowance-head"><div><div class="allowance-title"><span class="color-dot big" style="--dot-color:' + a.color + '"></span>' + escapeHtml(a.name) + '</div><div class="allowance-meta">' + amountText + ' · 합계 ' + Math.round(calculateAllowanceAmount(a)).toLocaleString() + '원</div></div>'
          + '<div class="allowance-actions"><button class="soft-btn" onclick="openAllowancePicker(event,' + a.id + ')">' + btnText + '</button><button class="x-btn" onclick="deleteAllowance(' + a.id + ')">×</button></div></div>'
          + picker + '</div>';
      }).join('');
    }
    function escapeHtml(text){
      return String(text).replace(/[&<>'"]/g, function(ch){ return ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[ch]; });
    }

    function applyBusinessSizeRules(){
      const size = document.querySelector('input[name="businessSize"]:checked').value;
      const isUnder5 = size === 'under5';
      ['overtimeOption','weeklyOvertimeOption','nightOption','holidayOption'].forEach(id => {
        const el = document.getElementById(id);
        el.checked = !isUnder5;
        el.disabled = false;
      });
      document.querySelectorAll('input[name="holidayApplyType"]').forEach(el => { el.disabled = false; });
      const hint = document.getElementById('businessSizeHint');
      if(hint){
        hint.textContent = isUnder5
          ? '5인 미만 기준으로 가산수당을 껐습니다.'
          : '5인 이상 기준으로 가산수당을 켰습니다.';
      }
    }
    function toggleCustomTax(){ document.getElementById('customTaxBox').style.display = getSelectedTaxType() === 'custom' ? 'block' : 'none'; }
    function toggleProbationRateBox(){
      const box = document.getElementById('probationRateBox');
      const checked = document.getElementById('probationOption')?.checked || false;
      if(box) box.style.display = checked ? 'grid' : 'none';
    }
    function clampProbationRate(){
      const input = document.getElementById('probationRate');
      if(!input) return 10;
      let value = Number(input.value);
      if(Number.isNaN(value)) value = 0;
      if(value < 0) value = 0;
      if(value > 10) value = 10;
      input.value = value;
      return value;
    }
    function getProbationRate(){
      const input = document.getElementById('probationRate');
      if(!input) return 10;
      let value = Number(input.value);
      if(Number.isNaN(value)) value = 0;
      return Math.min(Math.max(value, 0), 10);
    }
    function getSelectedTaxType(){ const s = document.querySelector('input[name="taxType"]:checked'); return s ? s.value : 'none'; }
    function getTaxRate(){ const t = getSelectedTaxType(); if(t === 'none') return 0; if(t === '3.3') return 3.3; if(t === 'insurance') return 9.7; if(t === 'custom') return Number(document.getElementById('customTaxRate').value); return 0; }
    function getSelectedHolidayApplyType(){ const s = document.querySelector('input[name="holidayApplyType"]:checked'); return s ? s.value : 'publicOnly'; }
    function isPublicHoliday(dateKey){ return Boolean(getHolidayInfo(dateKey)); }
    function isSunday(dateKey){ const p = dateKey.split('-'); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])).getDay() === 0; }
    function getHolidayNameForDate(dateKey){ const info = getHolidayInfo(dateKey); return info ? info.name : ''; }
    function isHoliday(dateKey){
      const type = getSelectedHolidayApplyType();
      if(type === 'none') return false;
      if(type === 'sundayAndPublic') return isSunday(dateKey) || isPublicHoliday(dateKey);
      return isPublicHoliday(dateKey);
    }
    function getHolidayLabel(dateKey){
      const name = getHolidayNameForDate(dateKey);
      const sunday = isSunday(dateKey);
      if(name && sunday) return name + ' + 일요일';
      if(name) return name;
      if(sunday) return '일요일';
      return '평일';
    }
    function getHolidayExtraForDay(dateKey, real, hourlyWage){
      if(!document.getElementById('holidayOption').checked || !isHoliday(dateKey)) return 0;
      return Math.min(real, 8) * hourlyWage * 0.5 + Math.max(real - 8, 0) * hourlyWage * 1.0;
    }
    function refreshAfterOptionChange(){ updateSelectedDayDetails(); renderCalendar(); renderAllowanceList(); }
    function getWeekKey(dateKey){ const p = dateKey.split('-'); const date = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])); const day = date.getDay(); const offset = day === 0 ? -6 : 1 - day; const monday = new Date(date); monday.setDate(date.getDate() + offset); return monday.getFullYear() + '-' + pad(monday.getMonth()+1) + '-' + pad(monday.getDate()); }

    function buildWeeklyData(keys){
      const weeklyHours = {};
      const dailyOvertimeHoursByWeek = {};
      keys.forEach(key => {
        const rec = workRecords[key];
        const real = rec.realHours;
        const dailyOver = Math.max(real - 8, 0);
        const weekKey = getWeekKey(key);
        weeklyHours[weekKey] = (weeklyHours[weekKey] || 0) + real;
        dailyOvertimeHoursByWeek[weekKey] = (dailyOvertimeHoursByWeek[weekKey] || 0) + dailyOver;
      });
      return { weeklyHours, dailyOvertimeHoursByWeek };
    }

    function calculateDailyRows(hourlyWage){
      const useOvertime = document.getElementById('overtimeOption').checked;
      const useWeeklyOvertime = document.getElementById('weeklyOvertimeOption').checked;
      const useNight = document.getElementById('nightOption').checked;
      const useHoliday = document.getElementById('holidayOption').checked;
      const keys = Object.keys(workRecords).sort();
      const weeklyData = buildWeeklyData(keys);
      const weeklyExtraMap = {};
      if(useWeeklyOvertime){
        Object.keys(weeklyData.weeklyHours).forEach(w => {
          const weekOver = Math.max(weeklyData.weeklyHours[w] - 40, 0);
          const dailyOverAlready = weeklyData.dailyOvertimeHoursByWeek[w] || 0;
          weeklyExtraMap[w] = Math.max(weekOver - dailyOverAlready, 0);
        });
      }
      const weeklyExtraUsedMap = {};
      return keys.map(key => {
        const rec = workRecords[key];
        const real = rec.realHours;
        const weekKey = getWeekKey(key);
        const base = real * hourlyWage;
        const dailyOverHours = Math.max(real - 8, 0);
        const dailyOverExtra = useOvertime ? dailyOverHours * hourlyWage * 0.5 : 0;
        const remainingWeekExtra = Math.max((weeklyExtraMap[weekKey] || 0) - (weeklyExtraUsedMap[weekKey] || 0), 0);
        const nonDailyHours = Math.max(real - dailyOverHours, 0);
        const weeklyOverHoursForDay = Math.min(remainingWeekExtra, nonDailyHours);
        weeklyExtraUsedMap[weekKey] = (weeklyExtraUsedMap[weekKey] || 0) + weeklyOverHoursForDay;
        const weeklyOverExtra = weeklyOverHoursForDay * hourlyWage * 0.5;
        const nightHours = calculateNightHours(rec.startTime, rec.endTime, rec.breakHours);
        const nightExtra = useNight ? nightHours * hourlyWage * 0.5 : 0;
        const holidayExtra = useHoliday ? getHolidayExtraForDay(key, real, hourlyWage) : 0;
        const allowanceMoney = calculateAllowanceTotalForDate(key);
        return {
          date: key,
          startTime: rec.startTime,
          endTime: rec.endTime,
          breakHours: rec.breakHours,
          realHours: real,
          basePay: base,
          dailyOverHours,
          dailyOverExtra,
          weeklyOverHours: weeklyOverHoursForDay,
          weeklyOverExtra,
          nightHours,
          nightExtra,
          holidayLabel: getHolidayLabel(key),
          holidayExtra,
          allowanceMoney,
          total: base + dailyOverExtra + weeklyOverExtra + nightExtra + holidayExtra + allowanceMoney
        };
      });
    }

    function buildDetailTable(rows){
      if(isMobileView()) return '';
      if(!rows.length) return '';
      const body = rows.map(r => '<tr>'
        + '<td>' + r.date + '</td>'
        + '<td>' + r.startTime + '~' + r.endTime + '</td>'
        + '<td>' + r.realHours.toFixed(1) + '</td>'
        + '<td>' + Math.round(r.basePay).toLocaleString() + '</td>'
        + '<td>' + r.dailyOverHours.toFixed(1) + 'h / ' + Math.round(r.dailyOverExtra).toLocaleString() + '</td>'
        + '<td>' + r.weeklyOverHours.toFixed(1) + 'h / ' + Math.round(r.weeklyOverExtra).toLocaleString() + '</td>'
        + '<td>' + r.nightHours.toFixed(1) + 'h / ' + Math.round(r.nightExtra).toLocaleString() + '</td>'
        + '<td>' + escapeHtml(r.holidayLabel) + ' / ' + Math.round(r.holidayExtra).toLocaleString() + '</td>'
        + '<td>' + Math.round(r.allowanceMoney).toLocaleString() + '</td>'
        + '<td>' + Math.round(r.total).toLocaleString() + '</td>'
        + '</tr>').join('');
      return '<div id="detailTableAccordion" class="collapsible-box"><button type="button" class="collapsible-head" onclick="toggleAccordion(\'detailTableAccordion\')" aria-expanded="false"><div><strong>날짜별 계산 상세표</strong><span>보고 싶은 사람만 펼쳐서 날짜별 기본급·연장·야간·휴일·추가수당을 확인해요.</span></div><span class="collapsible-arrow" aria-hidden="true"><svg class="collapsible-arrow-icon" viewBox="0 0 24 24" focusable="false"><polyline points="6 9 12 15 18 9"></polyline></svg></span></button><div class="collapsible-body"><div class="table-wrap"><table class="detail-table"><thead><tr><th>날짜</th><th>근무</th><th>실근무</th><th>기본급</th><th>일 연장</th><th>주 연장</th><th>야간</th><th>휴일</th><th>추가수당</th><th>일 합계</th></tr></thead><tbody>' + body + '</tbody></table></div></div></div>';
    }


    function calculateMonthlyPay(){
      const hourlyWage = Number(document.getElementById('hourlyWage').value);
      const useWeeklyHoliday = document.getElementById('weeklyHolidayOption').checked;
      const taxRate = getTaxRate();
      const keys = Object.keys(workRecords).sort();
      if(!hourlyWage || hourlyWage <= 0){ alert('시급을 정확히 입력해주세요.'); return; }
      if(keys.length === 0){ alert('근무한 날짜를 먼저 추가해주세요.'); return; }

      const rows = calculateDailyRows(hourlyWage);
      lastCalculationRows = rows;
      const weeklyHours = buildWeeklyData(keys).weeklyHours;
      const totalHours = rows.reduce((sum, r) => sum + r.realHours, 0);
      const nightHoursTotal = rows.reduce((sum, r) => sum + r.nightHours, 0);
      const basePay = rows.reduce((sum, r) => sum + r.basePay, 0);
      const dailyOvertimeExtra = rows.reduce((sum, r) => sum + r.dailyOverExtra, 0);
      const weeklyOvertimeExtra = rows.reduce((sum, r) => sum + r.weeklyOverExtra, 0);
      const nightExtra = rows.reduce((sum, r) => sum + r.nightExtra, 0);
      const holidayExtra = rows.reduce((sum, r) => sum + r.holidayExtra, 0);
      const allowanceTotal = rows.reduce((sum, r) => sum + r.allowanceMoney, 0);

      let weeklyHolidayPay = 0, weeklyHolidayCount = 0;
      if(useWeeklyHoliday){
        Object.keys(weeklyHours).forEach(w => {
          const h = weeklyHours[w];
          if(h >= 15){ const paidHours = Math.min((h / 40) * 8, 8); weeklyHolidayPay += paidHours * hourlyWage; weeklyHolidayCount++; }
        });
      }

      const grossPayBeforeProbation = basePay + dailyOvertimeExtra + weeklyOvertimeExtra + nightExtra + holidayExtra + weeklyHolidayPay + allowanceTotal;
      const useProbation = document.getElementById('probationOption')?.checked || false;
      const probationRate = useProbation ? getProbationRate() : 0;
      const probationDeduction = useProbation ? grossPayBeforeProbation * (probationRate / 100) : 0;
      const grossPay = grossPayBeforeProbation - probationDeduction;
      const taxAmount = grossPay * (taxRate / 100);
      const netPay = grossPay - taxAmount;
      lastCalculationSummary = { workDays: keys.length, totalHours, nightHoursTotal, basePay, dailyOvertimeExtra, weeklyOvertimeExtra, nightExtra, holidayExtra, weeklyHolidayPay, weeklyHolidayCount, allowanceTotal, grossPayBeforeProbation, useProbation, probationRate, probationDeduction, grossPay, taxRate, taxAmount, netPay };

      const detailLinesHtml = 
        '<div class="result-guide"><strong>계산 기준 안내</strong><br>아래 금액은 입력한 근무일·시급·수당 옵션으로 계산한 참고용 예상값입니다. 실제 지급액은 근로계약서, 사업장 규모, 소정근로일 개근 여부, 공휴일 적용 기준에 따라 달라질 수 있어요.</div>'
        + '<div class="result-line"><span>근무일수</span><strong>' + keys.length + '일</strong></div>'
        + '<div class="result-line"><span>총 실근무시간</span><strong>' + totalHours.toFixed(1) + '시간</strong></div>'
        + '<div class="result-line"><span>야간근로시간</span><strong>' + nightHoursTotal.toFixed(1) + '시간</strong></div>'
        + '<div class="result-line"><span>기본급</span><strong>' + Math.round(basePay).toLocaleString() + '원</strong></div>'
        + '<div class="result-line"><span>일 8시간 초과 연장 가산</span><strong>' + Math.round(dailyOvertimeExtra).toLocaleString() + '원</strong></div>'
        + '<div class="result-line"><span>주 40시간 초과 연장 가산</span><strong>' + Math.round(weeklyOvertimeExtra).toLocaleString() + '원</strong></div>'
        + '<div class="result-line"><span>야간 가산수당</span><strong>' + Math.round(nightExtra).toLocaleString() + '원</strong></div>'
        + '<div class="result-line"><span>휴일 가산수당</span><strong>' + Math.round(holidayExtra).toLocaleString() + '원</strong></div>'
        + '<div class="result-line"><span>주휴수당(추정)</span><strong>' + Math.round(weeklyHolidayPay).toLocaleString() + '원 (' + weeklyHolidayCount + '주)</strong></div>'
        + '<div class="result-line"><span>추가 수당</span><strong>' + Math.round(allowanceTotal).toLocaleString() + '원</strong></div>'
        + (useProbation ? '<div class="result-line"><span>수습기간 감액 전 금액</span><strong>' + Math.round(grossPayBeforeProbation).toLocaleString() + '원</strong></div>' : '')
        + (useProbation ? '<div class="result-line"><span>수습기간 ' + probationRate + '% 감액</span><strong>-' + Math.round(probationDeduction).toLocaleString() + '원</strong></div>' : '')
        + '<div class="result-line"><span>세전 예상 월급</span><strong>' + Math.round(grossPay).toLocaleString() + '원</strong></div>'
        + '<div class="result-line"><span>공제율</span><strong>' + taxRate + '%</strong></div>'
        + '<div class="result-line"><span>예상 공제액</span><strong>' + Math.round(taxAmount).toLocaleString() + '원</strong></div>'
        + '<div class="result-line result-total"><span>예상 세후 월급</span><strong>' + Math.round(netPay).toLocaleString() + '원</strong></div>';

      const summaryHtml = 
        '<div class="result-summary-grid">'
        + '<div class="result-summary-card primary"><span>예상 세후 월급</span><strong>' + Math.round(netPay).toLocaleString() + '원</strong></div>'
        + '<div class="result-summary-card"><span>총 근무시간</span><strong>' + totalHours.toFixed(1) + '시간</strong></div>'
        + '<div class="result-summary-card"><span>근무일수</span><strong>' + keys.length + '일</strong></div>'
        + '</div>';

      const resultExtraHtml = isMobileView()
        ? '<div id="mobileResultDetails" class="mobile-result-details' + (mobileResultDetailsOpen ? ' open' : '') + '"><button type="button" id="mobileResultDetailsBtn" class="mobile-result-details-head" onclick="toggleMobileResultDetails()">' + (mobileResultDetailsOpen ? '<span>급여 상세정보 닫기</span><span>⌃</span>' : '<span>급여 상세정보 열기</span><span>⌄</span>') + '</button><div class="mobile-result-details-body">' + detailLinesHtml + '</div></div><p class="muted">※ 모바일에서는 핵심 결과를 먼저 보여줘요. 더 자세한 날짜별 표는 PC 버전에서 확인하면 편합니다.</p>'
        : detailLinesHtml + buildDetailTable(rows) + '<p class="muted">※ 날짜별 상세표는 기본급·일 연장·주 연장·야간·휴일·추가수당이 어떻게 쌓였는지 확인하는 용도입니다. 주휴수당(추정)은 주 단위 수당이라 날짜별 표에는 나누어 넣지 않았습니다.</p>';

      document.getElementById('result').innerHTML = summaryHtml + resultExtraHtml;
      hasCalculatedOnce = true;
      normalizeStepCardsAfterCalculation();
      clearDirty();
      updateLastCalculated();
    }



    function toggleMobileAllowanceSection(){
      const section = document.getElementById('allowanceSection');
      const btn = document.getElementById('mobileAllowanceToggle');
      if(!section || !btn) return;
      section.classList.toggle('open');
      const isOpen = section.classList.contains('open');
      btn.innerHTML = isOpen
        ? '<span>추가수당 접기</span><span class="toggle-arrow">⌃</span>'
        : '<span>추가수당 추가</span><span class="toggle-arrow">⌄</span>';
    }

    function toggleMobileResultDetails(){
      const box = document.getElementById('mobileResultDetails');
      const btn = document.getElementById('mobileResultDetailsBtn');
      if(!box || !btn) return;
      box.classList.toggle('open');
      const open = box.classList.contains('open');
      mobileResultDetailsOpen = open;
      btn.innerHTML = open ? '<span>급여 상세정보 닫기</span><span>⌃</span>' : '<span>급여 상세정보 열기</span><span>⌄</span>';
    }

    function toggleAccordion(id){
      const box = document.getElementById(id);
      if(!box) return;
      setAccordionOpen(id, !box.classList.contains('open'));
      scheduleCalculatorDraftSave();
    }


    function compactProjectData(data){
      const recordArray = Object.keys(data.workRecords || {}).sort().map(k => {
        const r = data.workRecords[k];
        return [k, r.startTime, r.endTime, breakHoursToMinutes(r.breakHours), r.patternColor || ''];
      });
      const allowanceArray = (data.allowances || []).map(a => [a.id, a.name, a.type, a.amount, a.hourlyRate, a.hourMode, a.hours, a.color, a.dates || []]);
      return {v:2,y:data.year,m:data.month,w:data.hourlyWage,ds:data.defaultStartTime,de:data.defaultEndTime,db:data.defaultBreakMinutes,bs:data.businessSize,tt:data.taxType,cr:data.customTaxRate,ht:data.holidayApplyType,po:data.probationOption,pr:data.probationRate,o:data.options,r:recordArray,a:allowanceArray};
    }
    function expandProjectData(data){
      if(data && data.v === 2 && Array.isArray(data.r)){
        const records = {};
        data.r.forEach(item => {
          const key = item[0], startTime = item[1], endTime = item[2], breakHours = minutesToBreakHours(item[3]);
          records[key] = { startTime, endTime, breakHours, realHours:Number(calculateRealHours(startTime, endTime, breakHours).toFixed(2)), patternId:null, patternName:startTime + '–' + endTime + ' 근무', patternColor:item[4] || '#2563eb' };
        });
        const allowanceList = (data.a || []).map(item => ({ id:item[0], name:item[1], type:item[2], amount:item[3], hourlyRate:item[4], hourMode:item[5], hours:item[6], color:item[7], dates:item[8] || [] }));
        return {version:2, year:data.y, month:data.m, hourlyWage:data.w, defaultStartTime:data.ds, defaultEndTime:data.de, defaultBreakMinutes:data.db, businessSize:data.bs, taxType:data.tt, customTaxRate:data.cr, holidayApplyType:data.ht, probationOption:data.po, probationRate:data.pr, options:data.o, workRecords:records, allowances:allowanceList};
      }
      if(data && data.v && data.r !== undefined){ return {version:data.v, year:data.y, month:data.m, hourlyWage:data.w, defaultStartTime:data.ds, defaultEndTime:data.de, defaultBreakMinutes:data.db, businessSize:data.bs, taxType:data.tt, customTaxRate:data.cr, holidayApplyType:data.ht, probationOption:data.po, probationRate:data.pr, options:data.o, workRecords:data.r, allowances:data.a}; }
      return data;
    }

    function encodeProjectDataForUrl(){
      const json = JSON.stringify(compactProjectData(collectProjectData()));
      return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
    }
    function decodeProjectDataFromUrl(encoded){
      let e = String(encoded || '').replace(/-/g, '+').replace(/_/g, '/');
      while(e.length % 4) e += '=';
      return expandProjectData(JSON.parse(decodeURIComponent(escape(atob(e)))));
    }
    function getShareBaseUrl(){
      if(location.protocol === 'file:') return 'https://albabee.pages.dev/';
      return location.origin + '/';
    }
    function buildShareUrl(){
      return getShareBaseUrl() + '#data=' + encodeProjectDataForUrl();
    }
    function logShareDebug(step, detail){
      if(window && window.console){
        console.info('[AlbaBEE share]', step, detail || '');
      }
    }
    function logShareError(step, error, detail){
      if(window && window.console){
        console.error('[AlbaBEE share]', step, error, detail || '');
      }
    }
    function isShortShareUrl(url){
      try {
        const parsed = new URL(url, location.origin);
        return /^\/s\/[^/?#]+\/?$/.test(parsed.pathname) && !parsed.hash;
      } catch(e) {
        return false;
      }
    }
    async function createShortShareUrl(options){
      const isTest = Boolean(options && options.test);
      const encoded = isTest ? 'AbC123_-' : encodeProjectDataForUrl();
      logShareDebug('serialize:success', { encodedLength: encoded.length, test: isTest });
      try{
        logShareDebug('short-link:request', { endpoint: '/s', test: isTest });
        const response = await fetch('/s', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: encoded,
            title: isTest ? 'share-debug-test' : getShareTitleForKakao(),
            description: isTest ? 'share debug test' : getShareSummaryText()
          }),
          cache: 'no-store'
        });
        let json = null;
        let rawText = '';
        try {
          rawText = await response.text();
          json = rawText ? JSON.parse(rawText) : null;
        } catch(parseError) {
          logShareError('short-link:response-parse-failed', parseError, { status: response.status, rawText: rawText });
        }
        logShareDebug('short-link:response', { status: response.status, ok: response.ok, body: json, rawText: rawText });
        if(!response.ok){
          const reason = response.status === 503
            ? 'SHARE_KV binding missing or unavailable'
            : ((json && (json.message || json.error)) || rawText || 'short share create failed');
          throw new Error(reason);
        }
        const url = json && json.url ? new URL(json.url, location.origin).href : (json && json.id ? location.origin + '/s/' + encodeURIComponent(json.id) : '');
        if(url && isShortShareUrl(url)){
          logShareDebug('short-link:success', { url: url });
          return url;
        }
        throw new Error('short share response missing valid /s/{id} url');
      } catch(e) {
        logShareError('short-link:failed', e, {
          hint: 'Cloudflare Pages Functions /s 또는 KV binding(SHARE_KV, ALBABEE_SHARE_KV, SHARES)을 확인하세요.',
          likelyCause: e && /SHARE_KV|503/i.test(e.message || '') ? 'SHARE_KV binding missing' : 'network/function/response error',
          online: navigator.onLine,
          userAgent: navigator.userAgent
        });
      }
      return '';
    }
    async function buildShortShareUrl(){
      const shortUrl = await createShortShareUrl();
      if(shortUrl) return shortUrl;
      return '';
    }
    function getShareTitleForKakao(){
      const ym = getCurrentYearMonth();
      return ym.year + '년 ' + ym.month + '월 알바 근무표';
    }
    function getShareSummaryLines(){
      const hasRecords = Object.keys(workRecords || {}).length > 0;
      const hasWage = Number(document.getElementById('hourlyWage')?.value || 0) > 0;
      if(hasRecords && hasWage && !lastCalculationSummary) calculateMonthlyPay();
      const ym = getCurrentYearMonth();
      const lines = [ym.year + '년 ' + ym.month + '월 알바 급여 계산 결과'];
      if(lastCalculationSummary){
        lines.push('');
        lines.push('예상 세후 급여: ' + formatWon(lastCalculationSummary.netPay));
        lines.push('총 근무시간: ' + Number(lastCalculationSummary.totalHours || 0).toFixed(1).replace(/\.0$/, '') + '시간');
      }
      return lines;
    }
    function getShareSummaryText(){
      return getShareSummaryLines().join('\n');
    }
    function getShareDescriptionForKakao(){
      return getShareSummaryText();
    }
    async function shareToKakaoTalk(){
      const url = await createShortShareUrl();
      const title = getShareTitleForKakao();
      const shareMessage = getShareSummaryText();
      const fallback = function(){
        copyTextToClipboard(shareMessage, '카카오톡 공유창을 바로 열 수 없어 공유 문구를 복사했어요.');
      };

      if(!url || !isShortShareUrl(url)){
        showShortShareFailureBox('짧은 공유 링크 생성 실패\n\n' + getShareSummaryText());
        alert('짧은 공유 링크를 만들지 못했어요. 긴 링크가 채팅에 노출되지 않도록 공유를 중단했습니다. 아래에서 다시 시도하거나 요약 문구만 복사할 수 있어요.');
        return false;
      }

      // 모바일 크롬/사파리에서는 이 방식이 가장 안정적입니다. 카카오톡이 설치되어 있으면 공유 대상에 뜹니다.
      if(navigator.share){
        navigator.share({ title:title, text:shareMessage, url:url }).catch(function(){ fallback(); });
        return false;
      }

      // PC에서는 카카오 SDK를 먼저 시도하고, 실패하면 즉시 링크 복사/표시로 대체합니다.
      const kakaoJavascriptKey = '88aceef505f5dfe007a1cf217d46f4b0';
      try {
        if(window.Kakao && kakaoJavascriptKey){
          if(!Kakao.isInitialized()) Kakao.init(kakaoJavascriptKey);
          Kakao.Share.sendDefault({
            objectType: 'feed',
            content: {
              title: title,
              description: shareMessage,
              imageUrl: 'https://albabee.pages.dev/images/og/albabee-og.png',
              link: { mobileWebUrl: url, webUrl: url }
            },
            buttons: [{ title: '계산 결과 보기', link: { mobileWebUrl: url, webUrl: url } }],
            fail: fallback
          });
          return false;
        }
      } catch(e) {}

      fallback();
      return false;
    }


    async function writeTextToClipboard(text){
      if(navigator.clipboard && window.isSecureContext && document.hasFocus()){
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch(e) {}
      }
      return fallbackCopyText(text);
    }

    async function copyTextToClipboard(text, successMessage, failureMessage){
      const copied = await writeTextToClipboard(text);
      if(copied){
        alert(successMessage || '복사했어요.');
        return true;
      }
      alert(failureMessage || '자동 복사가 막혀서 아래 입력칸에서 직접 복사해주세요.');
      return false;
    }

    function fallbackCopyText(text){
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly','');
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.left = '-9999px';
      ta.style.fontSize = '16px';
      document.body.appendChild(ta);
      ta.focus({ preventScroll:true });
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      let copied = false;
      try { copied = document.execCommand('copy'); } catch(e) { copied = false; }
      document.body.removeChild(ta);
      return copied;
    }

    async function copyShareLink(){
      const url = await createShortShareUrl();
      if(!url || !isShortShareUrl(url)){
        showShortShareFailureBox('짧은 링크 생성 실패\n\n' + getShareSummaryText());
        alert('짧은 공유 링크를 만들지 못했어요. 긴 링크가 노출되지 않도록 링크 공유를 중단했습니다. 아래에서 다시 시도할 수 있어요.');
        return;
      }
      await showShareLinkBox(url);
      const copied = await copyTextToClipboard(getShareSummaryText(), '공유 문구를 복사했어요.', '자동 복사가 막혀서 공유 문구를 직접 복사할 수 있게 열어뒀어요.');
      if(!copied){
        const textarea = document.getElementById('shareLinkText');
        if(textarea){
          textarea.focus();
          textarea.select();
          textarea.setSelectionRange(0, textarea.value.length);
        }
      }
    }
    async function showShareLinkBox(forcedUrl){
      const box = document.getElementById('shareLinkBox');
      const textarea = document.getElementById('shareLinkText');
      const anchor = document.getElementById('shareLinkAnchor');
      const actions = document.getElementById('shareFallbackActions');
      const btn = document.getElementById('shareLinkToggleBtn');
      if(!box || !textarea) return;
      const url = forcedUrl || await createShortShareUrl();
      if(!url || !isShortShareUrl(url)){
        showShortShareFailureBox('짧은 링크 생성 실패\n\n' + getShareSummaryText());
        return;
      }
      textarea.value = getShareSummaryText();
      if(anchor){ anchor.href = url; anchor.querySelector('span').textContent = '공유 링크 열기'; }
      if(actions) actions.hidden = true;
      box.classList.add('show');
      if(btn){ btn.textContent = '공유 링크 접기'; btn.classList.add('open'); }
    }
    function showShortShareFailureBox(message){
      const box = document.getElementById('shareLinkBox');
      const textarea = document.getElementById('shareLinkText');
      const anchor = document.getElementById('shareLinkAnchor');
      const actions = document.getElementById('shareFallbackActions');
      const btn = document.getElementById('shareLinkToggleBtn');
      if(textarea) textarea.value = message || ('짧은 링크 생성 실패\n\n' + getShareSummaryText());
      if(anchor){ anchor.removeAttribute('href'); anchor.querySelector('span').textContent = '짧은 링크 생성 실패'; }
      if(actions) actions.hidden = false;
      if(box) box.classList.add('show');
      if(btn){ btn.textContent = '공유 링크 접기'; btn.classList.add('open'); }
    }
    async function retryCreateShortShareLink(){
      const url = await createShortShareUrl();
      if(!url || !isShortShareUrl(url)){
        showShortShareFailureBox('짧은 링크 생성 실패\n\n' + getShareSummaryText());
        alert('아직 짧은 링크를 만들지 못했어요. 콘솔의 [AlbaBEE share] 로그와 Cloudflare KV 바인딩을 확인해주세요.');
        return false;
      }
      await showShareLinkBox(url);
      await copyTextToClipboard(getShareSummaryText(), '공유 문구를 복사했어요.');
      return false;
    }
    async function copyShareSummaryText(){
      await copyTextToClipboard(getShareSummaryText(), '요약 문구를 복사했어요. 짧은 링크가 복구되면 다시 링크 공유를 시도해주세요.');
      return false;
    }
    function hideShareLinkBox(){
      const box = document.getElementById('shareLinkBox');
      const btn = document.getElementById('shareLinkToggleBtn');
      if(box) box.classList.remove('show');
      if(btn){ btn.textContent = '공유 링크 보기'; btn.classList.remove('open'); }
    }
    function toggleShareLinkBox(){
      const box = document.getElementById('shareLinkBox');
      if(box && box.classList.contains('show')) hideShareLinkBox();
      else showShareLinkBox();
    }
    function getShareIdFromPath(){
      const match = location.pathname.match(/^\/s\/([^/?#]+)\/?$/);
      return match ? decodeURIComponent(match[1]) : '';
    }
    function finishSharedProjectLoad(data, message){
      draftRestoreInProgress = true;
      try {
        applyProjectData(data);
      } finally {
        draftRestoreInProgress = false;
      }
      const hasRecords = data && data.workRecords && Object.keys(data.workRecords).length > 0;
      const hasWage = Number(data && data.hourlyWage) > 0;
      if(hasRecords && hasWage) calculateMonthlyPay();
      saveCalculatorDraftNow();
      const state = document.getElementById('saveState');
      if(state) state.textContent = message || '공유 링크에서 불러오기 완료';
      return true;
    }
    async function loadFromShortShareLink(){
      const id = getShareIdFromPath();
      if(!id) return false;
      try{
        const response = await fetch('/s/' + encodeURIComponent(id) + '?format=json', {
          headers: { 'Accept': 'application/json' },
          cache: 'no-store'
        });
        if(!response.ok) throw new Error('short share not found');
        const json = await response.json();
        if(!json || !json.data) throw new Error('short share data missing');
        const data = decodeProjectDataFromUrl(json.data);
        return finishSharedProjectLoad(data, '짧은 공유 링크에서 불러오기 완료');
      } catch(e){
        alert('공유 링크 데이터를 불러오지 못했어요. 링크가 만료되었거나 잘못된 주소일 수 있습니다.');
        return false;
      }
    }
    async function loadFromShareLink(){
      if(getShareIdFromPath()) return loadFromShortShareLink();
      if(!location.hash.startsWith('#data=')) return false;
      try{
        const data = decodeProjectDataFromUrl(location.hash.slice(6));
        return finishSharedProjectLoad(data, '기존 공유 링크에서 불러오기 완료');
      } catch(e){
        alert('공유 링크 데이터를 불러오지 못했어요.');
        return false;
      }
    }

    function collectProjectData(){
      return {
        version: 16,
        savedAt: new Date().toISOString(),
        year: document.getElementById('year').value,
        month: document.getElementById('month').value,
        hourlyWage: document.getElementById('hourlyWage').value,
        defaultStartTime: document.getElementById('defaultStartTime').value,
        defaultEndTime: document.getElementById('defaultEndTime').value,
        defaultBreakHours: minutesToBreakHours(document.getElementById('defaultBreakHours').value),
        defaultBreakMinutes: Number(document.getElementById('defaultBreakHours').value || 0),
        businessSize: document.querySelector('input[name="businessSize"]:checked')?.value || '5plus',
        taxType: getSelectedTaxType(),
        customTaxRate: document.getElementById('customTaxRate').value,
        holidayApplyType: getSelectedHolidayApplyType(),
        probationOption: document.getElementById('probationOption')?.checked || false,
        probationRate: getProbationRate(),
        options: {
          overtime: document.getElementById('overtimeOption').checked,
          weeklyOvertime: document.getElementById('weeklyOvertimeOption').checked,
          night: document.getElementById('nightOption').checked,
          holiday: document.getElementById('holidayOption').checked,
          weeklyHoliday: document.getElementById('weeklyHolidayOption').checked
        },
        workRecords, allowances
      };
    }
    function applyProjectData(data){
      if(!data) return;
      document.getElementById('year').value = data.year || document.getElementById('year').value;
      document.getElementById('month').value = data.month || document.getElementById('month').value;
      document.getElementById('hourlyWage').value = data.hourlyWage || document.getElementById('hourlyWage').value;
      document.getElementById('defaultStartTime').value = data.defaultStartTime || '11:00';
      document.getElementById('defaultEndTime').value = data.defaultEndTime || '21:00';
      document.getElementById('defaultBreakHours').value = data.defaultBreakMinutes ?? breakHoursToMinutes(data.defaultBreakHours ?? 1);
      const size = document.querySelector('input[name="businessSize"][value="' + (data.businessSize || '5plus') + '"]'); if(size) size.checked = true;
      const tax = document.querySelector('input[name="taxType"][value="' + (data.taxType || 'none') + '"]'); if(tax) tax.checked = true;
      document.getElementById('customTaxRate').value = data.customTaxRate ?? 0.9;
      const holidayType = document.querySelector('input[name="holidayApplyType"][value="' + (data.holidayApplyType || 'publicOnly') + '"]'); if(holidayType) holidayType.checked = true;
      const probation = document.getElementById('probationOption'); if(probation) probation.checked = !!data.probationOption;
      const probationRateInput = document.getElementById('probationRate'); if(probationRateInput) probationRateInput.value = data.probationRate ?? 10;
      toggleProbationRateBox();
      if(data.options){
        document.getElementById('overtimeOption').checked = !!data.options.overtime;
        document.getElementById('weeklyOvertimeOption').checked = !!data.options.weeklyOvertime;
        document.getElementById('nightOption').checked = !!data.options.night;
        document.getElementById('holidayOption').checked = !!data.options.holiday;
        document.getElementById('weeklyHolidayOption').checked = !!data.options.weeklyHoliday;
      }
      const keepAllRecords = !!data.keepAllRecords;
      workRecords = data.workRecords || {};
      const activePrefix = (data.year || document.getElementById('year').value) + '-' + pad(Number(data.month || document.getElementById('month').value)) + '-';
      if(!keepAllRecords) Object.keys(workRecords || {}).forEach(k => { if(!k.startsWith(activePrefix)) delete workRecords[k]; });
      scheduleColorMap = {};
      Object.keys(workRecords || {}).sort().forEach(k => { const r = workRecords[k]; if(r && r.patternColor) scheduleColorMap[getScheduleSignature(r.startTime, r.endTime, r.breakHours)] = r.patternColor; });
      allowances = (data.allowances || []).map(a => ({ ...a, dates: keepAllRecords ? (a.dates || []) : (a.dates || []).filter(d => d.startsWith(activePrefix)) })).filter(a => keepAllRecords || (a.dates || []).length > 0);
      toggleCustomTax(); applyBusinessSizeRules(); updateMinimumWageInfo(); renderCalendar(); renderAllowanceList(); updateSelectedDayDetails();
    }
    function ensureCalculated(){ if(!lastCalculationRows.length){ calculateMonthlyPay(); } return lastCalculationRows.length > 0; }
    function excelEscape(value){ return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function buildExcelCalendarHtml(){
      const ym = getCurrentYearMonth();
      const year = ym.year, month = ym.month;
      const firstDay = new Date(year, month - 1, 1).getDay();
      const lastDate = new Date(year, month, 0).getDate();
      let html = '<tr><td class="section" colspan="16">메인 달력 요약</td></tr>';
      html += '<tr><th colspan="16">' + year + '년 ' + month + '월 근무 달력</th></tr>';
      html += '<tr>' + ['일','월','화','수','목','금','토'].map(d => '<th colspan="2">' + d + '</th>').join('') + '<th colspan="2">비고</th></tr>';
      let day = 1;
      for(let week=0; week<6 && day<=lastDate; week++){
        html += '<tr>';
        for(let wd=0; wd<7; wd++){
          if((week === 0 && wd < firstDay) || day > lastDate){
            html += '<td colspan="2" class="calendar-cell blank"></td>';
          } else {
            const key = getDateKey(year, month, day);
            const rec = workRecords[key];
            const holidayName = getFixedHolidayName(month, day, year);
            const als = getAllowancesForDate(key);
            let txt = day + '일';
            if(holidayName) txt += '<br>' + excelEscape(holidayName);
            if(rec) txt += '<br>' + excelEscape(rec.startTime + '–' + rec.endTime) + '<br>휴게 ' + breakHoursToMinutes(rec.breakHours) + '분';
            if(als.length) txt += '<br>수당: ' + excelEscape(als.map(a => a.name).join(', '));
            html += '<td colspan="2" class="calendar-cell' + (rec ? ' workday' : '') + '">' + txt + '</td>';
            day++;
          }
        }
        html += '<td colspan="2"></td></tr>';
      }
      return html;
    }


    function safeSheetName(name){ return String(name).replace(/[\\/?*\\[\\]:]/g, ' ').slice(0, 31) || 'Sheet'; }
    function setCellLink(ws, address, target, tooltip){
      if(!ws || !ws[address] || !target) return;
      ws[address].l = { Target: target, Tooltip: tooltip || target };
      ws[address].s = Object.assign({}, ws[address].s || {}, { font:{ color:{ rgb:'2563EB' }, underline:true } });
    }
    function setColumnWidths(ws, widths){ ws['!cols'] = widths.map(w => ({ wch:w })); }
    function applyHeaderStyle(ws, rangeAddress){
      if(!ws || !ws['!ref'] || !window.XLSX) return;
      const range = XLSX.utils.decode_range(rangeAddress || ws['!ref']);
      for(let R=range.s.r; R<=range.e.r; R++){
        for(let C=range.s.c; C<=range.e.c; C++){
          const addr = XLSX.utils.encode_cell({r:R,c:C});
          if(ws[addr]) ws[addr].s = Object.assign({}, ws[addr].s || {}, { font:{ bold:true }, alignment:{ horizontal:'center' } });
        }
      }
    }
    function makeAoASheet(aoa, widths){
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      if(widths) setColumnWidths(ws, widths);
      return ws;
    }
    function loadXlsxLibrary(){
      return new Promise(function(resolve){
        if(window.XLSX){ resolve(true); return; }
        const sources = [
          'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
          'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js'
        ];
        let idx = 0;
        function tryNext(){
          if(window.XLSX){ resolve(true); return; }
          if(idx >= sources.length){ resolve(false); return; }
          const s = document.createElement('script');
          s.src = sources[idx++];
          s.async = true;
          s.onload = function(){ resolve(Boolean(window.XLSX)); };
          s.onerror = tryNext;
          document.head.appendChild(s);
        }
        tryNext();
      });
    }


    function csvEscape(value){
      const text = String(value ?? '');
      return '"' + text.replace(/"/g, '""') + '"';
    }
    function downloadTextFile(filename, text, mime){
      const blob = new Blob(['\ufeff' + text], { type: mime || 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 0);
    }
    async function downloadSimpleCsv(){
      if(!ensureCalculated() || !lastCalculationSummary) return;
      const ym = getCurrentYearMonth();
      const sum = lastCalculationSummary;
      const shareUrl = await buildShortShareUrl();
      const rows = [];
      rows.push(['구분','항목','값']);
      if(shareUrl) rows.push(['요약','공유 링크', shareUrl]);
      rows.push(['요약','근무월', ym.year + '년 ' + ym.month + '월']);
      rows.push(['요약','근무일수', sum.workDays + '일']);
      rows.push(['요약','총 실근무시간', sum.totalHours.toFixed(1) + '시간']);
      rows.push(['요약','기본급', Math.round(sum.basePay) + '원']);
      rows.push(['요약','일 8시간 초과 연장가산', Math.round(sum.dailyOvertimeExtra) + '원']);
      rows.push(['요약','주 40시간 초과 연장가산', Math.round(sum.weeklyOvertimeExtra) + '원']);
      rows.push(['요약','야간가산', Math.round(sum.nightExtra) + '원']);
      rows.push(['요약','휴일가산', Math.round(sum.holidayExtra) + '원']);
      rows.push(['요약','주휴수당(추정)', Math.round(sum.weeklyHolidayPay) + '원']);
      rows.push(['요약','추가수당', Math.round(sum.allowanceTotal) + '원']);
      rows.push(['요약','세전 예상 월급', Math.round(sum.grossPay) + '원']);
      rows.push(['요약','예상 공제액', Math.round(sum.taxAmount) + '원']);
      rows.push(['요약','예상 세후 월급', Math.round(sum.netPay) + '원']);
      rows.push([]);
      rows.push(['날짜','출근','퇴근','휴게시간(분)','실근무시간','기본급','일연장시간','일연장가산','주연장시간','주연장가산','야간시간','야간가산','휴일구분','휴일가산','추가수당','일합계']);
      (lastCalculationRows || []).forEach(function(r){
        rows.push([r.date,r.startTime,r.endTime,breakHoursToMinutes(r.breakHours),r.realHours.toFixed(2),Math.round(r.basePay),r.dailyOverHours.toFixed(2),Math.round(r.dailyOverExtra),r.weeklyOverHours.toFixed(2),Math.round(r.weeklyOverExtra),r.nightHours.toFixed(2),Math.round(r.nightExtra),r.holidayLabel,Math.round(r.holidayExtra),Math.round(r.allowanceMoney),Math.round(r.total)]);
      });
      const csv = rows.map(function(row){ return row.map(csvEscape).join(','); }).join('\n');
      downloadTextFile('alba-pay-detail-' + ym.year + '-' + pad(ym.month) + '.csv', csv, 'text/csv;charset=utf-8;');
    }

    async function downloadAdvancedXlsx(){
      if(!ensureCalculated() || !lastCalculationSummary) return;
      const loaded = await loadXlsxLibrary();
      if(!loaded || !window.XLSX){
        alert('XLSX 파일 생성 도구를 불러오지 못했습니다. 인터넷 연결이 막혀 있으면 임시로 엑셀 호환 파일(.xls)을 저장합니다.');
        await downloadExcelCompatibleFile();
        return;
      }
      const ym = getCurrentYearMonth();
      const sum = lastCalculationSummary;
      const shareUrl = await buildShortShareUrl();
      const wb = XLSX.utils.book_new();
      wb.Props = { Title:'알바 월급 계산 결과', Subject:'급여 계산', Author:'알바 월급 계산기', CreatedDate:new Date() };

      const summaryAoa = [
        ['알바 월급 계산 요약', ''],
        ['공유 링크 열기', shareUrl || ''],
        ['근무월', ym.year + '년 ' + ym.month + '월'],
        ['근무일수', sum.workDays + '일'],
        ['총 실근무시간', sum.totalHours.toFixed(1) + '시간'],
        ['야간근로시간', sum.nightHoursTotal.toFixed(1) + '시간'],
        ['기본급', Math.round(sum.basePay) + '원'],
        ['일 8시간 초과 연장가산', Math.round(sum.dailyOvertimeExtra) + '원'],
        ['주 40시간 초과 연장가산', Math.round(sum.weeklyOvertimeExtra) + '원'],
        ['야간가산', Math.round(sum.nightExtra) + '원'],
        ['휴일가산', Math.round(sum.holidayExtra) + '원'],
        ['주휴수당(추정)', Math.round(sum.weeklyHolidayPay) + '원'],
        ['추가수당', Math.round(sum.allowanceTotal) + '원'],
        ['수습기간 감액 전 금액', Math.round(sum.grossPayBeforeProbation ?? sum.grossPay) + '원'],
        ['수습기간 ' + (sum.probationRate ?? 10) + '% 감액', '-' + Math.round(sum.probationDeduction || 0) + '원'],
        ['세전 예상 월급', Math.round(sum.grossPay) + '원'],
        ['예상 공제액', Math.round(sum.taxAmount) + '원'],
        ['예상 세후 월급', Math.round(sum.netPay) + '원']
      ];
      const wsSummary = makeAoASheet(summaryAoa, [28, 64]);
      wsSummary['!merges'] = [{ s:{r:0,c:0}, e:{r:0,c:1} }];
      if(shareUrl) setCellLink(wsSummary, 'B2', shareUrl, '계산값 공유 링크 열기');
      applyHeaderStyle(wsSummary, 'A1:B1');
      XLSX.utils.book_append_sheet(wb, wsSummary, '급여 요약');

      const detailHeader = ['날짜','출근','퇴근','휴게시간(분)','실근무시간','기본급','일연장시간','일연장가산','주연장시간','주연장가산','야간시간','야간가산','휴일구분','휴일가산','추가수당','일합계'];
      const detailAoa = [detailHeader].concat(lastCalculationRows.map(r => [r.date,r.startTime,r.endTime,breakHoursToMinutes(r.breakHours),Number(r.realHours.toFixed(2)),Math.round(r.basePay),Number(r.dailyOverHours.toFixed(2)),Math.round(r.dailyOverExtra),Number(r.weeklyOverHours.toFixed(2)),Math.round(r.weeklyOverExtra),Number(r.nightHours.toFixed(2)),Math.round(r.nightExtra),r.holidayLabel,Math.round(r.holidayExtra),Math.round(r.allowanceMoney),Math.round(r.total)]));
      const wsDetail = makeAoASheet(detailAoa, [14,10,10,12,12,12,12,12,12,12,12,12,16,12,12,12]);
      wsDetail['!autofilter'] = { ref: XLSX.utils.encode_range({s:{r:0,c:0}, e:{r:Math.max(0, detailAoa.length-1), c:detailHeader.length-1}}) };
      applyHeaderStyle(wsDetail, 'A1:P1');
      XLSX.utils.book_append_sheet(wb, wsDetail, '날짜별 근무내역');

      const allowanceHeader = ['수당 이름','방식','금액/시간당','시간 계산','적용 시간','적용 날짜 수','적용 날짜'];
      const allowanceAoa = [allowanceHeader].concat((allowances || []).map(a => [
        a.name,
        a.type === 'fixed' ? '고정 금액' : '시간 수당',
        a.type === 'fixed' ? Math.round(a.amount || 0) + '원' : Math.round(a.hourlyRate || 0) + '원/시간',
        a.type === 'hourly' ? (a.hourMode === 'workHours' ? '실근무시간 전체' : '직접 입력') : '-',
        a.type === 'hourly' && a.hourMode !== 'workHours' ? (a.hours || 0) + '시간' : '-',
        (a.dates || []).length + '일',
        (a.dates || []).slice().sort().join(', ')
      ]));
      const wsAllowance = makeAoASheet(allowanceAoa, [18,14,16,18,12,12,60]);
      applyHeaderStyle(wsAllowance, 'A1:G1');
      XLSX.utils.book_append_sheet(wb, wsAllowance, '수당 내역');

      const settingsAoa = [
        ['설정 항목','값'],
        ['계산 연월', ym.year + '년 ' + ym.month + '월'],
        ['시급', (Number(document.getElementById('hourlyWage').value) || 0) + '원'],
        ['사업장 규모', document.getElementById('size5plus').checked ? '5인 이상' : '5인 미만'],
        ['연장수당', document.getElementById('overtimeOption').checked ? '계산함' : '계산 안 함'],
        ['주 40시간 초과 연장수당', document.getElementById('weeklyOvertimeOption').checked ? '계산함' : '계산 안 함'],
        ['야간수당', document.getElementById('nightOption').checked ? '계산함' : '계산 안 함'],
        ['휴일수당', document.getElementById('holidayOption').checked ? '계산함' : '계산 안 함'],
        ['휴일수당 적용 기준', getSelectedHolidayApplyType()],
        ['주휴수당', document.getElementById('weeklyHolidayOption').checked ? '계산함' : '계산 안 함'],
        ['세금 방식', document.getElementById('taxType').value],
        ['공유 링크', shareUrl || '']
      ];
      const wsSettings = makeAoASheet(settingsAoa, [26, 64]);
      if(shareUrl) setCellLink(wsSettings, 'B12', shareUrl, '계산값 공유 링크 열기');
      applyHeaderStyle(wsSettings, 'A1:B1');
      XLSX.utils.book_append_sheet(wb, wsSettings, '설정값');

      try {
        XLSX.writeFile(wb, 'alba-pay-detail-' + ym.year + '-' + pad(ym.month) + '.xlsx', { bookType:'xlsx', cellStyles:true });
      } catch(err) {
        try {
          XLSX.writeFile(wb, 'alba-pay-detail-' + ym.year + '-' + pad(ym.month) + '.xlsx', { bookType:'xlsx' });
        } catch(err2) {
          alert('XLSX 저장 중 오류가 나서 엑셀 호환 파일(.xls)로 대신 저장합니다.');
          await downloadExcelCompatibleFile();
        }
      }
    }

    async function downloadExcelCompatibleFile(){
      if(!ensureCalculated() || !lastCalculationSummary) return;
      const sum = lastCalculationSummary;
      const shareUrl = await buildShortShareUrl();
      const summaryRows = [
        ['알바 월급 계산 요약',''],
        ['근무일수', sum.workDays + '일'],
        ['총 실근무시간', sum.totalHours.toFixed(1) + '시간', 'important'],
        ['야간근로시간', sum.nightHoursTotal.toFixed(1) + '시간'],
        ['기본급', Math.round(sum.basePay) + '원'],
        ['일 8시간 초과 연장가산', Math.round(sum.dailyOvertimeExtra) + '원'],
        ['주 40시간 초과 연장가산', Math.round(sum.weeklyOvertimeExtra) + '원'],
        ['야간가산', Math.round(sum.nightExtra) + '원'],
        ['휴일가산', Math.round(sum.holidayExtra) + '원'],
        ['주휴수당(추정)', Math.round(sum.weeklyHolidayPay) + '원'],
        ['추가수당', Math.round(sum.allowanceTotal) + '원'],
        ['수습기간 감액 전 금액', Math.round(sum.grossPayBeforeProbation ?? sum.grossPay) + '원'],
        ['수습기간 ' + (sum.probationRate ?? 10) + '% 감액', '-' + Math.round(sum.probationDeduction || 0) + '원'],
        ['세전 예상 월급', Math.round(sum.grossPay) + '원', 'important'],
        ['예상 공제액', Math.round(sum.taxAmount) + '원'],
        ['예상 세후 월급', Math.round(sum.netPay) + '원', 'important']
      ];
      if(shareUrl) summaryRows.splice(1, 0, ['공유 링크', shareUrl, 'skip']);
      const header = ['날짜','출근','퇴근','휴게시간','실근무시간','기본급','일연장시간','일연장가산','주연장시간','주연장가산','야간시간','야간가산','휴일구분','휴일가산','추가수당','일합계'];
      const detailRows = lastCalculationRows.map(r => [r.date,r.startTime,r.endTime,r.breakHours,r.realHours.toFixed(2),Math.round(r.basePay),r.dailyOverHours.toFixed(2),Math.round(r.dailyOverExtra),r.weeklyOverHours.toFixed(2),Math.round(r.weeklyOverExtra),r.nightHours.toFixed(2),Math.round(r.nightExtra),r.holidayLabel,Math.round(r.holidayExtra),Math.round(r.allowanceMoney),Math.round(r.total)]);
      let html = '<html><head><meta charset="UTF-8"><style>'
        + 'table{border-collapse:collapse;font-family:Arial,"Noto Sans KR",sans-serif;font-size:12px;}td,th{border:1px solid #d1d5db;padding:7px 9px;white-space:nowrap;}th{background:#111827;color:white;font-weight:900;} .title{font-size:18px;font-weight:900;background:#eef2ff;} .label{background:#f8fafc;font-weight:800;} .important td,.important{background:#fff7ed;font-weight:900;color:#9a3412;} .section{background:#e5e7eb;font-weight:900;} .linkcell{max-width:420px;overflow:hidden;white-space:nowrap;} .calendar-cell{width:120px;height:76px;vertical-align:top;white-space:normal;background:#fff;} .calendar-cell.workday{background:#eff6ff;font-weight:800;} .calendar-cell.blank{background:#f9fafb;}</style></head><body>';
      html += '<table><colgroup><col style="width:190px"><col style="width:140px"><col span="14" style="width:105px"></colgroup>';
      summaryRows.forEach((row, idx) => {
        if(idx === 0) html += '<tr><td class="title" colspan="16">' + excelEscape(row[0]) + '</td></tr>';
        else { const isLink = row[2] === 'skip'; html += '<tr class="' + (row[2] === 'important' ? 'important' : '') + '"><td class="label">' + excelEscape(row[0]) + '</td><td class="' + (isLink ? 'linkcell' : '') + '" colspan="15">' + (isLink ? '<a href="' + excelEscape(row[1]) + '">공유 링크 열기</a>' : excelEscape(row[1])) + '</td></tr>'; }
      });
      html += buildExcelCalendarHtml();
      html += '<tr><td class="section" colspan="16">날짜별 상세</td></tr><tr>' + header.map(h => '<th>' + excelEscape(h) + '</th>').join('') + '</tr>';
      detailRows.forEach(row => { html += '<tr>' + row.map(v => '<td>' + excelEscape(v) + '</td>').join('') + '</tr>'; });
      html += '</table></body></html>';
      const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const a = document.createElement('a');
      const ym = getCurrentYearMonth();
      a.href = URL.createObjectURL(blob);
      a.download = '알바월급계산_Excel_' + ym.year + '-' + pad(ym.month) + '.xls';
      a.click();
      URL.revokeObjectURL(a.href);
    }
    async function copyResultSummary(){
      if(!ensureCalculated() || !lastCalculationSummary) return;
      const sum = lastCalculationSummary;
      const shareUrl = await buildShortShareUrl();
      const text = '알바 월급 계산 요약\n'
        + '근무일수: ' + sum.workDays + '일\n'
        + '총 실근무시간: ' + sum.totalHours.toFixed(1) + '시간\n'
        + '야간근로시간: ' + sum.nightHoursTotal.toFixed(1) + '시간\n'
        + '기본급: ' + Math.round(sum.basePay).toLocaleString() + '원\n'
        + '일 8시간 초과 연장가산: ' + Math.round(sum.dailyOvertimeExtra).toLocaleString() + '원\n'
        + '주 40시간 초과 연장가산: ' + Math.round(sum.weeklyOvertimeExtra).toLocaleString() + '원\n'
        + '야간가산: ' + Math.round(sum.nightExtra).toLocaleString() + '원\n'
        + '휴일가산: ' + Math.round(sum.holidayExtra).toLocaleString() + '원\n'
        + '주휴수당(추정): ' + Math.round(sum.weeklyHolidayPay).toLocaleString() + '원\n'
        + '추가수당: ' + Math.round(sum.allowanceTotal).toLocaleString() + '원\n'
        + (sum.useProbation ? '수습기간 ' + (sum.probationRate ?? 10) + '% 감액: -' + Math.round(sum.probationDeduction || 0).toLocaleString() + '원\n' : '')
        + '세전 예상 월급: ' + Math.round(sum.grossPay).toLocaleString() + '원\n'
        + '예상 공제액: ' + Math.round(sum.taxAmount).toLocaleString() + '원\n'
        + '예상 세후 월급: ' + Math.round(sum.netPay).toLocaleString() + '원'
        + (shareUrl ? '\n계산값 확인 링크: ' + shareUrl : '');
      copyTextToClipboard(text, '문자용 요약을 복사했어요.', text);
    }

    window.addEventListener('resize', function(){ document.body.classList.toggle('pc-detail-hover', detailViewMode && !isMobileView()); hideDayDetailTooltip(); });

    const MINIMUM_WAGE_BY_YEAR = {
      2025: 10030,
      2026: 10320
    };
    function getMinimumWageForYear(year){
      if(MINIMUM_WAGE_BY_YEAR[year]) return MINIMUM_WAGE_BY_YEAR[year];
      const knownYears = Object.keys(MINIMUM_WAGE_BY_YEAR).map(Number).sort((a,b) => a-b);
      return MINIMUM_WAGE_BY_YEAR[knownYears[knownYears.length - 1]];
    }
    function getMinimumWageSourceYear(year){
      if(MINIMUM_WAGE_BY_YEAR[year]) return year;
      const knownYears = Object.keys(MINIMUM_WAGE_BY_YEAR).map(Number).sort((a,b) => a-b);
      return knownYears[knownYears.length - 1];
    }
    function updateMinimumWageInfo(){
      const year = Number(document.getElementById('year').value) || new Date().getFullYear();
      const wage = getMinimumWageForYear(year);
      const sourceYear = getMinimumWageSourceYear(year);
      const box = document.getElementById('minimumWageInfo');
      if(!box) return;
      const note = sourceYear === year ? year + '년 적용 최저시급' : year + '년 기준이 아직 코드에 없어서 최신 등록값(' + sourceYear + '년)을 표시 중';
      const warning = sourceYear === year ? '' : '<div class="mobile-test-note">새 연도 최저시급이 발표되면 코드의 MINIMUM_WAGE_BY_YEAR 값만 추가하면 됩니다.</div>';
      box.innerHTML = '<div><strong>' + note + ': ' + wage.toLocaleString() + '원</strong><div class="standard-badge">현재 적용 기준: ' + sourceYear + '년 최저시급 데이터</div><div class="muted">처음 열 때 연도·월은 오늘 날짜 기준, 시급은 해당 연도 최저시급으로 자동 설정돼요.</div>' + warning + '</div><button type="button" onclick="applyMinimumWageToHourlyInput()">최저시급 적용</button>';
    }
    function applyMinimumWageToHourlyInput(){
      const year = Number(document.getElementById('year').value) || new Date().getFullYear();
      document.getElementById('hourlyWage').value = getMinimumWageForYear(year);
      updateMinimumWageInfo();
    }
    function setInitialDateAndWageDefaults(){
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      const yearEl = document.getElementById('year');
      const monthEl = document.getElementById('month');
      const wageEl = document.getElementById('hourlyWage');
      if(yearEl) yearEl.value = y;
      if(monthEl) monthEl.value = m;
      if(wageEl) wageEl.value = getMinimumWageForYear(y);
      updateMinimumWageInfo();
    }

    function acceptCookieConsent(){
      try { localStorage.setItem('wageCalcCookieConsent', 'accepted'); } catch(e) {}
      const box = document.getElementById('cookieConsent');
      if(box) box.classList.remove('show');
    }
    function initCookieConsent(){
      let accepted = false;
      try { accepted = localStorage.getItem('wageCalcCookieConsent') === 'accepted'; } catch(e) {}
      const box = document.getElementById('cookieConsent');
      if(box && !accepted) box.classList.add('show');
    }
    const allowanceColors = [
      { name:'초록', value:'#22c55e' },
      { name:'파랑', value:'#2563eb' },
      { name:'주황', value:'#f97316' },
      { name:'보라', value:'#7c3aed' },
      { name:'분홍', value:'#ec4899' },
      { name:'하늘', value:'#06b6d4' },
      { name:'노랑', value:'#eab308' },
      { name:'회색', value:'#64748b' }
    ];

    function pad(n){ return String(Number(n) || 0).padStart(2, '0'); }
    function getCurrentYearMonth(){
      const y = Number(document.getElementById('year')?.value) || new Date().getFullYear();
      const m = Math.min(12, Math.max(1, Number(document.getElementById('month')?.value) || (new Date().getMonth()+1)));
      return { year:y, month:m };
    }
    function getDateKey(year, month, day){ return year + '-' + pad(month) + '-' + pad(day); }
    function formatWon(n){ return Math.round(Number(n) || 0).toLocaleString() + '원'; }
    function isMobileView(){
      if(document.body.classList.contains('force-mobile-view')) return true;
      if(document.body.classList.contains('force-pc-view')) return false;
      return window.matchMedia ? window.matchMedia('(max-width: 767px)').matches : window.innerWidth < 768;
    }
    function hexToRgba(hex, alpha){
      let h = String(hex || '#22c55e').replace('#','').trim();
      if(h.length === 3) h = h.split('').map(function(x){ return x+x; }).join('');
      const num = parseInt(h, 16);
      if(Number.isNaN(num)) return 'rgba(34,197,94,' + (alpha ?? 1) + ')';
      return 'rgba(' + ((num >> 16) & 255) + ',' + ((num >> 8) & 255) + ',' + (num & 255) + ',' + (alpha ?? 1) + ')';
    }
    function getFixedHolidayName(month, day, year){
      const md = pad(month) + '-' + pad(day);
      const fixed = {'01-01':'신정','03-01':'삼일절','05-05':'어린이날','06-06':'현충일','08-15':'광복절','10-03':'개천절','10-09':'한글날','12-25':'성탄절'};
      return fixed[md] || '';
    }
    const KOREAN_HOLIDAYS_BY_YEAR = {
      2026: {
        '2026-01-01': { name: '\uC2E0\uC815', type: 'holiday' },
        '2026-02-16': { name: '\uC124\uB0A0 \uC5F0\uD734', type: 'holiday' },
        '2026-02-17': { name: '\uC124\uB0A0', type: 'holiday' },
        '2026-02-18': { name: '\uC124\uB0A0 \uC5F0\uD734', type: 'holiday' },
        '2026-03-01': { name: '\uC0BC\uC77C\uC808', type: 'holiday' },
        '2026-03-02': { name: '\uC0BC\uC77C\uC808 \uB300\uCCB4\uACF5\uD734\uC77C', type: 'substitute' },
        '2026-05-05': { name: '\uC5B4\uB9B0\uC774\uB0A0', type: 'holiday' },
        '2026-05-24': { name: '\uBD80\uCC98\uB2D8\uC624\uC2E0\uB0A0', type: 'holiday' },
        '2026-05-25': { name: '\uBD80\uCC98\uB2D8\uC624\uC2E0\uB0A0 \uB300\uCCB4\uACF5\uD734\uC77C', type: 'substitute' },
        '2026-06-03': { name: '\uC804\uAD6D\uB3D9\uC2DC\uC9C0\uBC29\uC120\uAC70\uC77C', type: 'holiday' },
        '2026-06-06': { name: '\uD604\uCDA9\uC77C', type: 'holiday' },
        '2026-08-15': { name: '\uAD11\uBCF5\uC808', type: 'holiday' },
        '2026-08-17': { name: '\uAD11\uBCF5\uC808 \uB300\uCCB4\uACF5\uD734\uC77C', type: 'substitute' },
        '2026-09-24': { name: '\uCD94\uC11D \uC5F0\uD734', type: 'holiday' },
        '2026-09-25': { name: '\uCD94\uC11D', type: 'holiday' },
        '2026-09-26': { name: '\uCD94\uC11D \uC5F0\uD734', type: 'holiday' },
        '2026-10-03': { name: '\uAC1C\uCC9C\uC808', type: 'holiday' },
        '2026-10-05': { name: '\uAC1C\uCC9C\uC808 \uB300\uCCB4\uACF5\uD734\uC77C', type: 'substitute' },
        '2026-10-09': { name: '\uD55C\uAE00\uB0A0', type: 'holiday' },
        '2026-12-25': { name: '\uC131\uD0C4\uC808', type: 'holiday' }
      }
    };
    function getHolidayInfo(dateKey){
      const year = Number(String(dateKey).slice(0, 4));
      const yearly = KOREAN_HOLIDAYS_BY_YEAR[year];
      if(yearly && yearly[dateKey]) return yearly[dateKey];
      const p = String(dateKey).split('-');
      const name = getFixedHolidayName(Number(p[1]), Number(p[2]), Number(p[0]));
      return name ? { name, type: 'holiday' } : null;
    }
    function getHolidayBadgeLabel(info){
      if(!info) return '';
      return info.type === 'substitute' ? '\uB300\uCCB4' : info.name;
    }
    function getRecordPatternColor(rec){
      if(!rec) return '#22c55e';
      if(rec.patternColor) return rec.patternColor;
      return rec.color || getScheduleColor(rec.startTime, rec.endTime, rec.breakHours);
    }
    function getCurrentMonthSchedules(){
      const ym = getCurrentYearMonth();
      const prefix = ym.year + '-' + pad(ym.month) + '-';
      const schedules = {};
      Object.keys(workRecords || {}).sort().forEach(function(key){
        if(!key.startsWith(prefix)) return;
        const rec = workRecords[key];
        if(!rec) return;
        const sig = getScheduleSignature(rec.startTime, rec.endTime, rec.breakHours);
        if(!schedules[sig]){
          schedules[sig] = {
            color: getRecordPatternColor(rec),
            label: rec.startTime + '~' + rec.endTime,
            breakText: '휴게 ' + breakHoursToMinutes(rec.breakHours) + '분'
          };
        }
      });
      return Object.keys(schedules).map(function(sig){ return schedules[sig]; });
    }
    function renderMainCalendarLegend(){
      const box = document.getElementById('mainCalendarLegend');
      if(!box) return;
      const schedules = getCurrentMonthSchedules();
      let out = '<h3>달력 색상 안내</h3><p class="guide-help">날짜 배경색은 등록된 근무시간, 작은 점은 추가수당입니다.</p>';
      out += '<div class="guide-section"><div class="guide-section-title">근무시간</div><div class="guide-items">';
      out += schedules.length ? schedules.map(function(item){ return '<div class="guide-item"><span class="schedule-bg-swatch" style="--swatch-bg:' + hexToRgba(item.color, .16) + ';--swatch-border:' + hexToRgba(item.color, .8) + '"></span><span class="guide-label">' + escapeHtml(item.label) + ' · ' + escapeHtml(item.breakText) + '</span></div>'; }).join('') : '<div class="guide-empty">달력에서 근무일을 선택하면 시간대별 색상이 표시됩니다.</div>';
      out += '</div></div><div class="guide-section"><div class="guide-section-title">추가수당</div><div class="guide-items">';
      out += allowances.length ? allowances.map(function(a){ return '<div class="guide-item"><span class="color-dot" style="--dot-color:' + (a.color || '#22c55e') + '"></span><span class="guide-label">' + escapeHtml(a.name || '수당') + '</span></div>'; }).join('') : '<div class="guide-empty">추가수당을 만들면 여기에 표시됩니다.</div>';
      out += '</div></div>';
      box.innerHTML = out;
    }
    function updateCalendarBuildButton(){
      const btn = document.getElementById('calendarBuildBtn');
      if(!btn) return;
      const ym = getCurrentYearMonth();
      const changed = lastCalendarPeriod && (Number(lastCalendarPeriod.year) !== ym.year || Number(lastCalendarPeriod.month) !== ym.month);
      if(changed){ btn.textContent = '달력 적용'; btn.classList.remove('applied'); }
    }
    function handleCalendarPeriodChange(){
      const m = document.getElementById('month');
      if(m){ m.value = Math.min(12, Math.max(1, Number(m.value) || 1)); }
      updateCalendarBuildButton();
      changeMonth();
    }
    function setAllowanceColor(color){
      const input = document.getElementById('allowanceColor');
      if(input) input.value = color || getNextAllowanceColor();
      document.querySelectorAll('#allowanceColorPalette .color-choice').forEach(function(btn){
        btn.classList.toggle('selected', btn.dataset.color === (input ? input.value : color));
      });
    }
    function initColorPalette(){
      const palette = document.getElementById('allowanceColorPalette');
      if(!palette) return;
      palette.innerHTML = allowanceColors.map(function(c){
        return '<button type="button" class="color-choice" title="' + c.name + '" data-color="' + c.value + '" style="--dot-color:' + c.value + '" onclick="setAllowanceColor(\'' + c.value + '\')"></button>';
      }).join('');
      setAllowanceColor(document.getElementById('allowanceColor')?.value || getNextAllowanceColor());
    }
    function setViewMode(){
      const effective = ((window.innerWidth || 0) >= 768 ? 'pc' : 'mobile');
      document.body.classList.remove('force-mobile-view', 'force-pc-view', 'view-mode-mobile', 'view-mode-pc');
      if(effective === 'mobile') document.body.classList.add('force-mobile-view', 'view-mode-mobile');
      if(effective === 'pc') document.body.classList.add('force-pc-view', 'view-mode-pc');
      renderCalendar();
      if(lastCalculationRows && lastCalculationRows.length) calculateMonthlyPay();
      scheduleCalculatorDraftSave();
      return false;
    }
    function initViewMode(){
      try { localStorage.removeItem('albaPayViewMode'); } catch(e) {}
      setViewMode();
    }
    function changeMonth(){
      lastCalendarPeriod = getCurrentYearMonth();
      calendarHasBeenBuilt = true;
      renderCalendar(); renderAllowanceList(); updateMinimumWageInfo();
      const btn = document.getElementById('calendarBuildBtn');
      if(btn){ btn.classList.add('applied'); btn.textContent = '적용됨'; clearTimeout(calendarApplyTimer); calendarApplyTimer = setTimeout(function(){ btn.classList.remove('applied'); btn.textContent = '달력 적용'; }, 1200); }
      return false;
    }


    function installDirtyWrappers(){
      const names = [
        'deleteWorkDay','deleteSelectedWorkDay','applyDefaultTimeToSelectedDay','applySelectedDayTime','applyWeekdayToMonth','clearCurrentMonth','createAllowance','deleteAllowance','toggleAllowanceDate','changeMonth','refreshAfterOptionChange','applyBusinessSizeRules','setAllowanceColor'
      ];
      names.forEach(function(name){
        const original = window[name];
        if(typeof original !== 'function' || original.__dirtyWrapped) return;
        const wrapped = function(){
          const result = original.apply(this, arguments);
          if(name !== 'setAllowanceColor') markDirty();
          scheduleCalculatorDraftSave();
          return result;
        };
        wrapped.__dirtyWrapped = true;
        window[name] = wrapped;
      });
    }
    async function initializeCalculatorPersistence(){
      clearLegacyDraftStorage();
      const isShareEntry = Boolean(getShareIdFromPath()) || location.hash.startsWith('#data=');
      let loadedShared = false;
      let restoredDraft = false;
      try {
        loadedShared = await loadFromShareLink();
      } catch(e) {
        loadedShared = false;
      }
      if(!loadedShared && !isShareEntry) restoredDraft = restoreCalculatorDraft();
      if(isShareEntry && !loadedShared) draftClearedByUser = true;
      if(restoredDraft) restoreCalculatorUiState();
      draftPersistenceReady = true;
      installDirtyWatch();
      window.addEventListener('beforeunload', saveCalculatorDraftNow);
      window.addEventListener('pagehide', saveCalculatorDraftNow);
      saveCalculatorDraftNow();
      clearDirty();
    }

    function installInAppBrowserBridges(){
      const shareAnchor = document.getElementById('shareLinkAnchor');
      if(shareAnchor){
        shareAnchor.addEventListener('click', function(event){
          event.preventDefault();
          openExternalUrl(shareAnchor.href);
        });
      }
    }

    function getInfoTooltipLayer(){
      let layer = document.getElementById('infoTooltipLayer');
      if(layer) return layer;
      layer = document.createElement('div');
      layer.id = 'infoTooltipLayer';
      layer.className = 'info-tooltip-layer';
      layer.setAttribute('role', 'tooltip');
      document.body.appendChild(layer);
      return layer;
    }

    function hideInfoTooltip(){
      const layer = document.getElementById('infoTooltipLayer');
      if(layer) layer.classList.remove('show');
      document.querySelectorAll('.info.tooltip-active').forEach(function(el){ el.classList.remove('tooltip-active'); });
    }

    function showInfoTooltip(anchor){
      if(!anchor || !anchor.dataset || !anchor.dataset.tip) return;
      const layer = getInfoTooltipLayer();
      layer.textContent = anchor.dataset.tip;
      layer.classList.add('show');
      anchor.classList.add('tooltip-active');

      const gap = 10;
      const rect = anchor.getBoundingClientRect();
      layer.style.left = '0px';
      layer.style.top = '0px';
      const box = layer.getBoundingClientRect();
      let left = rect.right + 8;
      let top = rect.top - 8;

      if(left + box.width > window.innerWidth - gap) left = rect.left - box.width - 8;
      if(left < gap) left = Math.max(gap, window.innerWidth - box.width - gap);
      if(top + box.height > window.innerHeight - gap) top = window.innerHeight - box.height - gap;
      if(top < gap) top = rect.bottom + 8;
      if(top + box.height > window.innerHeight - gap) top = gap;

      layer.style.left = Math.round(left) + 'px';
      layer.style.top = Math.round(top) + 'px';
    }

    function installInfoTooltips(){
      document.addEventListener('mouseenter', function(event){
        const info = event.target.closest && event.target.closest('.info[data-tip]');
        if(info) showInfoTooltip(info);
      }, true);
      document.addEventListener('mouseleave', function(event){
        const info = event.target.closest && event.target.closest('.info[data-tip]');
        if(info) hideInfoTooltip();
      }, true);
      document.addEventListener('focusin', function(event){
        const info = event.target.closest && event.target.closest('.info[data-tip]');
        if(info) showInfoTooltip(info);
      });
      document.addEventListener('focusout', function(event){
        if(event.target.closest && event.target.closest('.info[data-tip]')) hideInfoTooltip();
      });
      document.addEventListener('click', function(event){
        const info = event.target.closest && event.target.closest('.info[data-tip]');
        if(info){
          event.preventDefault();
          event.stopPropagation();
          if(info.classList.contains('tooltip-active')) hideInfoTooltip(); else { hideInfoTooltip(); showInfoTooltip(info); }
          return;
        }
        hideInfoTooltip();
      });
      document.addEventListener('keydown', function(event){
        if(event.key === 'Escape') hideInfoTooltip();
      });
      window.addEventListener('scroll', hideInfoTooltip, true);
      window.addEventListener('resize', hideInfoTooltip);
    }

    function applyTossInAppPolicy(){
      if(!isTossInAppBrowser()) return;
      document.body.classList.add('is-toss-inapp');

      const support = document.getElementById('developerSupport');
      if(support) support.setAttribute('hidden', '');

      const kakaoShareBtn = document.getElementById('kakaoShareBtn');
      if(kakaoShareBtn) kakaoShareBtn.setAttribute('hidden', '');

      document.querySelectorAll('button[onclick*="copyShareLink"]').forEach(function(btn){
        btn.classList.add('toss-primary-share-btn');
      });
    }

    function registerServiceWorker(){
      if(!('serviceWorker' in navigator)) return;
      if(location.protocol !== 'https:' && location.hostname !== 'localhost') return;
      navigator.serviceWorker.register('/service-worker.js').catch(function(){});
    }

    window.__testShareLink = async function(){
      console.info('[AlbaBEE share test] start');
      const url = await createShortShareUrl({ test: true });
      const result = {
        ok: Boolean(url && isShortShareUrl(url)),
        url: url || '',
        hint: url ? 'short link created' : 'check [AlbaBEE share] logs; production 503 usually means SHARE_KV binding is missing'
      };
      console.info('[AlbaBEE share test] result', result);
      return result;
    };

    document.addEventListener('click', function(){
      if(activeAllowancePickerId !== null){ activeAllowancePickerId = null; renderAllowanceList(); }
    });
    setInitialDateAndWageDefaults();
    initViewMode();
    initStepFlow();
    initCookieConsent();
    initColorPalette();
    installInfoTooltips();
    installDayTooltipAutoHide();
    lastCalendarPeriod = getCurrentYearMonth();
    setAllowanceColor(getNextAllowanceColor());
    toggleAllowanceTypeFields();
    applyBusinessSizeRules();
    window.addEventListener('resize', function(){
      clearTimeout(viewModeResizeTimer);
      viewModeResizeTimer = setTimeout(function(){ setViewMode(); }, 160);
    });
    renderCalendar();
    renderAllowanceList();
    installDirtyWrappers();
    initializeCalculatorPersistence();
    installInAppBrowserBridges();
    applyTossInAppPolicy();
    registerServiceWorker();
