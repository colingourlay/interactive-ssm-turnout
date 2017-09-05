const {h, render} = require('preact');

require('./global.css');

const root = document.querySelector('[data-interactive-ssm-turnout-root]');

function init() {
  const Graphic = require('./components/Graphic');

  const stage = document.querySelector('.scrollyteller-stage');

  if (stage === null) {
    return setTimeout(init, 100);
  }

  if (root.parentElement !== stage) {
    stage.appendChild(root);
  }

  render(<Graphic dataURL={root.dataset.data} scrollyteller={stage.__SCROLLYTELLER__} />, root, root.firstChild);
}

init();

// Web Animations API polyfill (can be loaded async)

if (typeof root.animate !== 'function') {
  const script = document.createElement('script');
  const lastScript = document.getElementsByTagName('script')[0];
  
  script.async = true;
  script.src = `${__webpack_public_path__}web-animations.min.js`;
  lastScript.parentNode.insertBefore(script, lastScript);
}


if (module.hot) {
  module.hot.accept('./components/Graphic', () => {
    try {
      init();
    } catch (err) {
      const ErrorBox = require('./components/ErrorBox');

      render(<ErrorBox error={err} />, root, root.firstChild);
    }
  });
}

if (process.env.NODE_ENV === 'development') {
  require('preact/devtools');
}
