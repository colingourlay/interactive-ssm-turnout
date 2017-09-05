const animate = require('nanoanimation');
const {h, Component} = require('preact');
const styles = require('./Chart.css');

const ANIMATION_OPTIONS = {
  duration: 500,
  easing: 'cubic-bezier(0.42, 0, 0.58, 1)',
  fill: 'backwards'
};

class Chart extends Component {
  constructor({groups}) {
    super();
    
    this.state = {
      zOrder: groups.map(group => group.key)
    };

    this.dragTargetKey = null;
    this.gridRect = null;

    this.onDrag = this.onDrag.bind(this);
    this.onDragEnd = this.onDragEnd.bind(this);
  }

  componentWillReceiveProps({groups}) {
    this.setState({
      zOrder: groups.map(({key}) => key).sort((a, b) => {
        return this.state.zOrder.indexOf(a) - this.state.zOrder.indexOf(b)
      })
    });
  }

  componentWillUpdate() {
    this.getAnimatableEls()
    .forEach(el => el.dataset.from = JSON.stringify({
      opacity: el.style.opacity,
      transform: window.getComputedStyle(el).transform,
      width: el.style.width,
      height: el.style.height,
      left: el.style.left,
      bottom: el.style.bottom
    }));
  }

  componentDidUpdate({isInteractive}) {
    if (this.dragTargetKey) {
      return;
    }

    this.getAnimatableEls()
    .forEach((el, index) => {
      if (!el.dataset.from) {
        return;
      }

      const from = JSON.parse(el.dataset.from);
      const to = {
        opacity: el.style.opacity,
        transform: window.getComputedStyle(el).transform,
        width: el.style.width,
        height: el.style.height,
        left: el.style.left,
        bottom: el.style.bottom
      };

      if (
        from.opacity !== to.opacity ||
        from.transform !== to.transform ||
        from.width !== to.width ||
        from.height !== to.height ||
        from.left !== to.left ||
        from.bottom !== to.bottom
      ) {
        animate(el, [from, to], ANIMATION_OPTIONS).play();
      }

      delete el.dataset.from;
    });

    if (this.props.isInteractive && !isInteractive && !this._dragHint && this.props.groups.length) {
      this._dragHint = document.createElement('div');
      this._dragHint.className = styles.dragHint;
      this._dragHint.addEventListener('animationend', () => this._dragHint.parentElement.removeChild(this._dragHint));
      Array.from(this.base.querySelectorAll(`.${styles.groupPoint.split(' ')[0]}`)).reverse()[0].appendChild(this._dragHint);
    }
  }

  componentWillUnmount() {
    if (!this.dragTargetKey) {
      return;
    }

    document.removeEventListener('mousemove', this.onDrag);
    document.removeEventListener('touchmove', this.onDrag);
    document.removeEventListener('mouseup', this.onDragEnd);
    document.removeEventListener('touchend', this.onDragEnd);
    document.removeEventListener('touchcancel', this.onDragEnd);
  }

  translatePointerToValue(pointer) {
    return {
      x: Math.max(Math.min(pointer.clientX - this.gridRect.left, this.gridRect.width), 0) / this.gridRect.width * 100,
      y: 100 - Math.max(Math.min(pointer.clientY - this.gridRect.top, this.gridRect.height), 0) / this.gridRect.height * 100
    };
  }

  getAnimatableEls() {
    return Array.from(this.base.querySelectorAll(`.${styles.isAnimatable}`));
  }

  onDragStart(key, event) {
    if (this.dragTargetKey) {
      return;
    }

    event.preventDefault();

    const zOrder = [].concat(this.state.zOrder);

    zOrder.splice(zOrder.length - 1, 0, zOrder.splice(zOrder.indexOf(key), 1)[0]);

    this.dragTargetKey = key;
    this.gridRect = this.base.querySelector(`.${styles.grid}`).getBoundingClientRect();

    this.setState({zOrder});

    document.addEventListener('mousemove', this.onDrag);
    document.addEventListener('touchmove', this.onDrag);
    document.addEventListener('mouseup', this.onDragEnd);
    document.addEventListener('touchend', this.onDragEnd);
    document.addEventListener('touchcancel', this.onDragEnd);

    event.target.focus();
  }

  onDrag(event) {
    const {x, y} = this.translatePointerToValue(event.touches ? event.touches[0] : event);

    this.props.updateGroup(this.dragTargetKey, x, y);
  }

  onDragEnd(event) {
    this.dragTargetKey = null;
    this.gridRect = null;

    document.removeEventListener('mousemove', this.onDrag);
    document.removeEventListener('touchmove', this.onDrag);
    document.removeEventListener('mouseup', this.onDragEnd);
    document.removeEventListener('touchend', this.onDragEnd);
    document.removeEventListener('touchcancel', this.onDragEnd);
  }

  render({groups, isInteractive}) {
    relaxLabels(groups);

    const minXLabel = Math.min.apply(Math, groups.map(group => group.xLabel));
    const maxXLabel = Math.max.apply(Math, groups.map(group => group.xLabel));
    const minYLabel = Math.min.apply(Math, groups.map(group => group.yLabel));
    const maxYLabel = Math.max.apply(Math, groups.map(group => group.yLabel));

    const midGridines = [
      <div className={styles.midXGridline}></div>,
      <div className={styles.midYGridline}></div>
    ];

    const extentLabels = [
      <div className={styles.minLabel} style={{opacity: minXLabel <= 0 || minYLabel <= 0 ? 0 : 1}}>0%</div>,
      <div className={styles.maxXLabel} style={{opacity: maxXLabel > 90 ? 0 : 1}}>100%</div>,
      <div className={styles.maxYLabel} style={{opacity: maxYLabel > 94 ? 0 : 1}}>100%</div>,
    ];

    const groupGridlines = [];
    const groupLabels = [];
    const groupPoints = [];

    this.state.zOrder.forEach(key => {
      groups
      .filter(group => group.key === key)
      .forEach(group => {
        groupGridlines.push(
          <div key={`group${group.key}XGridline`}
               className={styles[`group${group.key}XGridline`]}
               style={{left: `${group.x}%`, height: `${group.y}%`}}></div>,
          <div key={`group${group.key}YGridline`}
               className={styles[`group${group.key}YGridline`]}
               style={{width: `${group.x}%`, bottom: `${group.y}%`}}></div>
        );
        groupLabels.push(
          <div key={`group${group.key}XLabel`}
               className={styles[`group${group.key}XLabel`]}
               data-text={`${Math.round(group.x)}%`}
               style={{left: `${group.xLabel}%`}}>{Math.round(group.x)}%</div>,
          <div key={`group${group.key}YLabel`}
               className={styles[`group${group.key}YLabel`]}
               data-text={`${Math.round(group.y)}%`}
               style={{bottom: `${group.yLabel}%`}}>{Math.round(group.y)}%</div>
        );
        groupPoints.push(
          <div key={`group${group.key}Point`}
               className={styles[isInteractive ? 'interactiveGroupPoint' : 'groupPoint']}
               style={{left: `${group.x}%`, bottom: `${group.y}%`}}
               onMouseDown={this.props.isInteractive ? this.onDragStart.bind(this, group.key) : null}
               onTouchStart={this.props.isInteractive ? this.onDragStart.bind(this, group.key) : null}>
            <div className={styles[`group${group.key}Shape`]}></div>
          </div>
        );
      });
    });

    return (
      <div className={styles.root}>
        <div className={styles.xAxisName}>Percent of voter turnout</div>
        <div className={styles.grid}>
          {midGridines
          .concat(groupGridlines)
          .concat(extentLabels)
          .concat(groupPoints)
          .concat(groupLabels)}
        </div>
        <div className={styles.yAxisName}>Percent of ‘Yes’ votes</div>
        <div className={styles.legend}>{groups.map(group => 
          <div className={styles.legendItem}>
            <div className={styles[`group${group.key}Shape`]}></div>
            <div className={styles[`group${group.key}Text`]}>{group.name}</div>
          </div>
        )}</div>
      </div>
    );
  }
}

module.exports = Chart;

function relaxLabels(groups) {
  const maxIterations = 10;
  const shift = .5;

  groups.forEach(group => {
    group.xLabel = group.x;
    group.yLabel = group.y;
  });

  (function relax(iteration) {
    let shouldIterate;

    groups.forEach((a, i) => {
      const aX = a.xLabel;
      const aY = a.yLabel;

      groups.slice(i + 1).forEach(b => {
        const bX = b.xLabel;
        const bY = b.yLabel;
        const diffX = aX - bX;
        const diffY = aY - bY;
        const xChars = (String(Math.round(aX)) + String(Math.round(bX))).length + 2;

        if (Math.abs(diffX) < xChars * 1.55) {
          const signX = diffX > 0 ? 1 : -1;

          a.xLabel = aX + signX * shift;
          b.xLabel = bX - signX * shift;

          shouldIterate = true;
        }

        if (Math.abs(diffY) < 5) {
          const signY = diffY > 0 ? 1 : -1;

          a.yLabel = aY + signY * shift;
          b.yLabel = bY - signY * shift;

          shouldIterate = true;
        }
      });
    });

    if (shouldIterate && iteration < maxIterations) {
      relax(iteration + 1);
    }
  })(0);
}
