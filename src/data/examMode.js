let _examMode = false;
let _listeners = [];

export const setExamMode = (active) => {
  _examMode = active;
  _listeners.forEach((fn) => fn(active));
};

export const isExamMode = () => _examMode;

export const onExamModeChange = (fn) => {
  _listeners.push(fn);
  return () => {
    _listeners = _listeners.filter((l) => l !== fn);
  };
};
