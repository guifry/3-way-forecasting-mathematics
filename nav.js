(function () {
  var isRoot = document.querySelector('link[href="style.css"]') !== null;
  var prefix = isRoot ? '' : '../';

  var phases = [
    { n: 0, name: 'Geometry', pages: [
      ['01-similar-triangles', 'Similar Triangles'], ['02-pythagorean-theorem', 'Pythagorean Theorem'],
      ['03-sqrt2-irrational', '\u221a2 is Irrational'], ['04-trigonometry', 'Trigonometry'],
      ['05-unit-circle', 'The Unit Circle'], ['06-coordinate-geometry', 'Coordinate Geometry'],
      ['07-trig-identities', 'Trig Identities']
    ]},
    { n: 1, name: 'Number Theory', pages: [
      ['01-divisibility', 'Divisibility'], ['02-primes', 'Primes & FTA'],
      ['03-modular-arithmetic', 'Modular Arithmetic'], ['04-fermat-little', "Fermat's Little Theorem"],
      ['05-euler-totient', "Euler's Totient"], ['06-crt', 'Chinese Remainder Theorem'],
      ['07-diophantine', 'Diophantine Equations']
    ]},
    { n: 2, name: 'Limits', pages: [
      ['00-inequalities', 'Inequalities'], ['01-completeness', 'Completeness'], ['02-squeeze-theorem', 'Squeeze Theorem'],
      ['03-monotone-convergence', 'Monotone Convergence'], ['04-bolzano-weierstrass', 'Bolzano\u2013Weierstrass'],
      ['05-cauchy-criterion', 'Cauchy Criterion'], ['06-ivt', 'IVT'],
      ['07-dense-subsets', 'Dense Subsets']
    ]},
    { n: 3, name: 'Calculus', pages: [
      ['01-derivative', 'The Derivative'], ['02-differentiation-rules', 'Differentiation Rules'],
      ['03-trig-derivatives', 'Trig Derivatives'], ['04-mean-value-theorem', 'Mean Value Theorem'],
      ['05-lhopital', "L'H\u00f4pital's Rule"], ['06-riemann-integral', 'Riemann Integral'],
      ['07-integrability', 'Integrability'], ['08-fundamental-theorem', 'Fundamental Theorem'],
      ['09-integration-techniques', 'Integration Techniques']
    ]},
    { n: 4, name: 'Power Series', pages: [
      ['01-taylor-theorem', "Taylor's Theorem"], ['02-power-series', 'Power Series'],
      ['03-exponential', 'The Exponential'], ['04-trig-series', 'Trig from Series'],
      ['05-term-by-term', 'Term-by-Term Ops'], ['06-abel-theorem', "Abel's Theorem"]
    ]},
    { n: 5, name: 'Convergence', pages: [
      ['01-comparison-test', 'Comparison Test'], ['02-ratio-test', 'Ratio & Root Tests'],
      ['03-alternating-series', 'Alternating Series'], ['04-absolute-conditional', 'Absolute Convergence'],
      ['05-cesaro-means', 'Ces\u00e0ro Means'], ['06-uniform-convergence', 'Uniform Convergence'],
      ['07-weierstrass-m-test', 'Weierstrass M-test'], ['08-weierstrass-approximation', 'Weierstrass Approximation']
    ]},
    { n: 6, name: 'Linear Algebra', pages: [
      ['00-systems-of-equations', 'Systems of Equations'], ['01-vector-spaces', 'Vector Spaces'], ['02-basis-dimension', 'Basis & Dimension'],
      ['03-linear-maps', 'Linear Maps'], ['04-matrices', 'Matrices'],
      ['05-determinants', 'Determinants'], ['06-eigenvalues', 'Eigenvalues'],
      ['07-inner-products', 'Inner Products'], ['08-projection', 'Projection'],
      ['09-spectral-theorem', 'Spectral Theorem'], ['10-cayley-hamilton', 'Cayley\u2013Hamilton'],
      ['11-jordan-normal-form', 'Jordan Normal Form']
    ]},
    { n: 7, name: 'Multivariable', pages: [
      ['01-partial-derivatives', 'Partial Derivatives'], ['02-chain-rule', 'Chain Rule'],
      ['03-schwarz', "Schwarz's Theorem"], ['04-implicit-inverse', 'Implicit & Inverse'],
      ['05-lagrange-multipliers', 'Lagrange Multipliers'], ['06-multiple-integrals', 'Multiple Integrals'],
      ['07-greens-theorem', "Green's Theorem"], ['08-stokes-divergence', 'Stokes & Divergence']
    ]},
    { n: 8, name: 'ODEs', pages: [
      ['01-first-order-odes', 'First-Order ODEs'], ['02-cauchy-lipschitz', 'Cauchy\u2013Lipschitz'],
      ['03-gronwall', "Gronwall's Lemma"], ['04-linear-odes', 'Linear ODEs'],
      ['05-variation-of-parameters', 'Variation of Parameters'], ['06-matrix-exponential', 'Matrix Exponential'],
      ['07-stability', 'Stability'], ['08-poincare-bendixson', 'Poincar\u00e9\u2013Bendixson']
    ]},
    { n: 9, name: 'Topology', pages: [
      ['01-metric-spaces', 'Metric Spaces'], ['02-open-closed', 'Open & Closed Sets'],
      ['03-completeness', 'Completeness'], ['04-compactness', 'Compactness'],
      ['05-continuity-compactness', 'Continuity & Compactness'], ['06-banach-fixed-point', 'Banach Fixed Point'],
      ['07-baire-arzela-ascoli', 'Baire & Arzel\u00e0\u2013Ascoli']
    ]},
    { n: 10, name: 'Algebra', pages: [
      ['01-groups', 'Groups'], ['02-subgroups-lagrange', 'Subgroups & Lagrange'],
      ['03-homomorphisms', 'Homomorphisms'], ['04-cayley-sylow', 'Cayley & Sylow'],
      ['05-abelian-groups', 'Abelian Groups'], ['06-rings-polynomials', 'Rings & Polynomials'],
      ['07-irreducibility-fta', 'Irreducibility & FTA'], ['08-galois-abel-ruffini', 'Galois & Abel\u2013Ruffini']
    ]},
    { n: 11, name: 'Fourier', pages: [
      ['01-fourier-series', 'Fourier Series'], ['02-convergence', 'Convergence'],
      ['03-parseval', "Parseval's Theorem"]
    ]},
    { n: 12, name: 'Probability', pages: [
      ['00-counting', 'Counting'], ['01-probability-spaces', 'Probability Spaces'], ['02-bayes', "Bayes' Theorem"],
      ['03-expectation', 'Expectation'], ['04-variance', 'Variance & Covariance'],
      ['05-markov-chebyshev', 'Markov & Chebyshev'], ['06-law-of-large-numbers', 'Law of Large Numbers'],
      ['07-central-limit-theorem', 'Central Limit Theorem'], ['08-conditional-expectation', 'Conditional Expectation']
    ]},
    { n: 13, name: 'Bilinear Algebra', pages: [
      ['01-bilinear-forms', 'Bilinear Forms'], ['02-quadratic-forms', 'Quadratic Forms'],
      ['03-spectral-theorem', 'Spectral Theorem'], ['04-svd', 'SVD'],
      ['05-rayleigh-courant-fischer', 'Rayleigh & Courant\u2013Fischer'], ['06-principal-axis', 'Principal Axis']
    ]},
    { n: 14, name: 'Functional Analysis', pages: [
      ['01-norms', 'Norms'], ['02-banach-spaces', 'Banach Spaces'],
      ['03-riesz-lemma', "Riesz's Lemma"], ['04-continuous-linear-maps', 'Continuous Linear Maps'],
      ['05-banach-steinhaus', 'Banach\u2013Steinhaus'], ['06-open-mapping', 'Open Mapping'],
      ['07-hahn-banach', 'Hahn\u2013Banach'], ['08-best-approximation', 'Best Approximation']
    ]},
    { n: 15, name: 'Game Theory', pages: [
      ['01-combinatorial-games', 'Combinatorial Games'], ['02-minimax', 'Minimax Theorem'],
      ['03-nash-equilibrium', 'Nash Equilibrium'], ['04-dominant-strategies', 'Dominant Strategies'],
      ['05-repeated-games', 'Repeated Games'], ['06-mechanism-design', 'Mechanism Design']
    ]}
  ];

  var currentPath = window.location.pathname;

  var sidebar = document.createElement('nav');
  sidebar.className = 'site-sidebar';

  var h = document.createElement('a');
  h.href = prefix + 'index.html';
  h.className = 'sidebar-title';
  h.textContent = 'CPGE Mathematics';
  sidebar.appendChild(h);

  var tools = document.createElement('div');
  tools.className = 'sidebar-tools';
  var toolLinks = [
    [prefix + 'fast-track.html', 'Fast Track (12 months)'],
    [prefix + 'mathematicians/index.html', 'Mathematicians'],
    [prefix + 'proofs/index.html', 'Proof Registry']
  ];
  toolLinks.forEach(function (t) {
    var a = document.createElement('a');
    a.href = t[0];
    a.className = 'sidebar-tool';
    if (currentPath.indexOf('fast-track') > -1 && t[0].indexOf('fast-track') > -1) a.classList.add('active');
    if (currentPath.indexOf(t[0].replace(prefix, '').replace('index.html', '')) > -1 && t[0].indexOf('mathematicians') > -1 && currentPath.indexOf('mathematicians') > -1) a.classList.add('active');
    if (currentPath.indexOf('proofs') > -1 && t[0].indexOf('proofs') > -1) a.classList.add('active');
    a.textContent = t[1];
    tools.appendChild(a);
  });
  sidebar.appendChild(tools);

  var hr = document.createElement('hr');
  hr.className = 'sidebar-hr';
  sidebar.appendChild(hr);

  var refresherTheory = [
    ['00a-arithmetic-rules', 'Arithmetic Rules'],
    ['00b-derivatives-integrals', 'Derivatives & Integrals'],
    ['00-factoring', 'Factoring'],
    ['01-equation-solving', 'Equation Solving'],
    ['02-polynomials', 'Polynomials'],
    ['03-concepts', 'Concepts'],
    ['07-trigonometry', 'Trigonometry']
  ];
  var refresherExercises = [
    ['00a-arithmetic-exercises', 'Arithmetic'],
    ['00b-derivatives-integrals-exercises', 'Derivatives & Integrals'],
    ['00-factoring-exercises', 'Factoring'],
    ['04-equation-exercises', 'Equation Solving'],
    ['05-polynomial-exercises', 'Polynomials'],
    ['06-concept-exercises', 'Concepts'],
    ['07-trigonometry-exercises', 'Trigonometry']
  ];

  var isRefresher = currentPath.indexOf('/refresher/') > -1;
  var isExercisePage = isRefresher && currentPath.indexOf('exercises') > -1;

  var list = document.createElement('div');
  list.className = 'sidebar-phases';

  var refresherDiv = document.createElement('div');
  refresherDiv.className = 'sidebar-phase';
  var refresherToggle = document.createElement('button');
  refresherToggle.className = 'sidebar-phase-toggle';
  refresherToggle.style.color = '#4a9';
  refresherToggle.textContent = 'Refresher';
  if (isRefresher) { refresherToggle.classList.add('active'); refresherToggle.classList.add('expanded'); }
  var refresherList = document.createElement('div');
  refresherList.className = 'sidebar-pages';
  if (isRefresher) refresherList.classList.add('open');

  var refresherIndex = document.createElement('a');
  refresherIndex.href = prefix + 'refresher/index.html';
  refresherIndex.className = 'sidebar-page';
  if (currentPath.indexOf('refresher/index') > -1) refresherIndex.classList.add('active');
  refresherIndex.textContent = 'Overview';
  refresherList.appendChild(refresherIndex);

  function buildSubSection(label, pages, parentEl, openByDefault) {
    var subToggle = document.createElement('button');
    subToggle.className = 'sidebar-phase-toggle';
    subToggle.style.fontSize = '0.72rem';
    subToggle.style.paddingLeft = '1.4rem';
    subToggle.style.color = '#6a9';
    subToggle.textContent = label;
    var isOpen = openByDefault && isRefresher;
    if (isOpen) subToggle.classList.add('expanded');
    var subPages = document.createElement('div');
    subPages.className = 'sidebar-pages';
    if (isOpen) subPages.classList.add('open');
    var hasActive = false;
    pages.forEach(function (p) {
      var a = document.createElement('a');
      a.href = prefix + 'refresher/' + p[0] + '.html';
      a.className = 'sidebar-page';
      a.style.paddingLeft = '2.2rem';
      if (currentPath.indexOf(p[0]) > -1 && isRefresher) { a.classList.add('active'); hasActive = true; }
      a.textContent = p[1];
      subPages.appendChild(a);
    });
    if (hasActive && !isOpen) { subPages.classList.add('open'); subToggle.classList.add('expanded'); }
    subToggle.addEventListener('click', function () {
      subPages.classList.toggle('open');
      subToggle.classList.toggle('expanded');
    });
    parentEl.appendChild(subToggle);
    parentEl.appendChild(subPages);
  }

  buildSubSection('Theory', refresherTheory, refresherList, true);
  buildSubSection('Exercises', refresherExercises, refresherList, false);

  refresherToggle.addEventListener('click', function () {
    refresherList.classList.toggle('open');
    refresherToggle.classList.toggle('expanded');
  });
  refresherDiv.appendChild(refresherToggle);
  refresherDiv.appendChild(refresherList);
  list.appendChild(refresherDiv);

  var refresherHr = document.createElement('hr');
  refresherHr.className = 'sidebar-hr';
  list.appendChild(refresherHr);

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
