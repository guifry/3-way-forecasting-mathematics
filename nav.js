(function () {
  var isRoot = document.querySelector('link[href="style.css"]') !== null;
  var prefix = isRoot ? '' : '../';

  var phases = [
    { n: 0, name: 'Statistical Toolkit', pages: [
      ['01-mean-and-median', 'Mean & Median'], ['02-dispersion', 'Dispersion & CV'],
      ['03-percentiles', 'Percentiles'], ['04-linear-regression', 'Linear Regression'],
      ['05-recurring-patterns', 'Recurring Patterns']
    ]},
    { n: 1, name: 'Growth & TVM', pages: [
      ['01-compound-interest', 'Compound Interest'], ['02-geometric-series', 'Geometric Series'],
      ['03-inflation-and-blended-growth', 'Inflation & Blended Growth']
    ]},
    { n: 2, name: 'Seasonal Decomposition', pages: [
      ['01-moving-averages', 'Moving Averages'], ['02-multiplicative-decomposition', 'Multiplicative Decomposition'],
      ['03-seasonal-floor', 'Seasonal Floor'], ['04-dampened-seasonality', 'Dampened Seasonality'],
      ['05-why-not-arima', 'Why Not ARIMA?']
    ]},
    { n: 3, name: 'Accounting Identity', pages: [
      ['01-double-entry', 'Double-Entry'], ['02-projected-pl', 'Projected P&L'],
      ['03-balance-sheet', 'Balance Sheet'], ['04-cash-flow-statement', 'Cash Flow Statement']
    ]},
    { n: 4, name: 'Working Capital', pages: [
      ['01-dso-dpo', 'DSO & DPO'], ['02-trend-extrapolation', 'Trend Extrapolation']
    ]},
    { n: 5, name: 'Uncertainty', pages: [
      ['01-random-walks', 'Random Walks'], ['02-uncertainty-model', 'Uncertainty Model'],
      ['03-combining-uncertainties', 'Combining Uncertainties']
    ]},
    { n: 6, name: 'Scenarios', pages: [
      ['01-adjustment-algebra', 'Adjustment Algebra'], ['02-fragments-and-cascade', 'Fragments & Cascade']
    ]},
    { n: 7, name: 'Full Model', pages: [
      ['01-ledger-to-assumptions', 'Ledger to Assumptions'], ['02-full-projection', 'Full Projection'],
      ['03-direct-method', 'Direct Method']
    ]}
  ];

  var currentPath = window.location.pathname;

  var sidebar = document.createElement('nav');
  sidebar.className = 'site-sidebar';

  var h = document.createElement('a');
  h.href = prefix + 'index.html';
  h.className = 'sidebar-title';
  h.textContent = 'Forecasting Maths';
  sidebar.appendChild(h);

  var tools = document.createElement('div');
  tools.className = 'sidebar-tools';
  var toolLinks = [
    [prefix + 'methodology.html', 'For Advisors'],
    [prefix + 'model-graph.html', 'Model Graph'],
    [prefix + 'model-diagram.html', 'Model Details'],
    [prefix + 'alignment.html', 'Course–Model Alignment'],
    [prefix + 'index.html#biographies', 'Mathematicians']
  ];
  toolLinks.forEach(function (t) {
    var a = document.createElement('a');
    a.href = t[0];
    a.className = 'sidebar-tool';
    if (currentPath.indexOf(t[0].replace(prefix, '').replace('#biographies', '')) > -1 && t[0].indexOf('#') === -1) a.classList.add('active');
    a.textContent = t[1];
    tools.appendChild(a);
  });
  sidebar.appendChild(tools);

  var hr = document.createElement('hr');
  hr.className = 'sidebar-hr';
  sidebar.appendChild(hr);

  var list = document.createElement('div');
  list.className = 'sidebar-phases';

  phases.forEach(function (phase) {
    var phaseDiv = document.createElement('div');
    phaseDiv.className = 'sidebar-phase';

    var toggle = document.createElement('button');
    toggle.className = 'sidebar-phase-toggle';
    toggle.textContent = phase.n + '. ' + phase.name;

    var isCurrentPhase = currentPath.indexOf('/phase' + phase.n + '/') > -1;
    if (isCurrentPhase) toggle.classList.add('active');

    var pages = document.createElement('div');
    pages.className = 'sidebar-pages';
    if (isCurrentPhase) pages.classList.add('open');

    phase.pages.forEach(function (p) {
      var a = document.createElement('a');
      a.href = prefix + 'phase' + phase.n + '/' + p[0] + '.html';
      a.className = 'sidebar-page';
      if (currentPath.indexOf(p[0]) > -1 && isCurrentPhase) a.classList.add('active');
      a.textContent = p[1];
      pages.appendChild(a);
    });

    toggle.addEventListener('click', function () {
      pages.classList.toggle('open');
      toggle.classList.toggle('expanded');
    });
    if (isCurrentPhase) toggle.classList.add('expanded');

    phaseDiv.appendChild(toggle);
    phaseDiv.appendChild(pages);
    list.appendChild(phaseDiv);
  });

  sidebar.appendChild(list);

  var hamburger = document.createElement('button');
  hamburger.className = 'sidebar-hamburger';
  hamburger.setAttribute('aria-label', 'Toggle navigation');
  hamburger.innerHTML = '<span></span><span></span><span></span>';
  hamburger.addEventListener('click', function () {
    sidebar.classList.toggle('open');
    hamburger.classList.toggle('open');
  });

  document.body.prepend(sidebar);
  document.body.prepend(hamburger);
})();
