import { plots, rovers, roverLabels, stageLabels, loadMissions, addMission, moveMission } from './model.mjs';
const find = (id) => document.getElementById(id);
const key = 'fieldlane-missions-v1';
const format = new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
let records;
let durable = true;
try { records = loadMissions(localStorage.getItem(key)); }
catch { records = loadMissions(null); durable = false; }

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text != null) element.textContent = text;
  if (className) element.className = className;
  return element;
}
function option(select, value, label) {
  const element = node('option', label);
  element.value = value;
  select.append(element);
}
function setFeedback(text, invalid = false) {
  find('feedback').textContent = text;
  find('feedback').classList.toggle('invalid', invalid);
}
function save(next) {
  records = next;
  try { localStorage.setItem(key, JSON.stringify(records)); durable = true; }
  catch { durable = false; }
  renderAll();
  return durable ? '' : ' 브라우저 저장이 차단돼 새로고침하면 사라져요.';
}

const plotSelect = find('plot');
const roverSelect = find('rover');
plots.forEach((plot) => {
  option(plotSelect, plot.id, plot.name + ' · ' + plot.id);
  const pin = node('button', null, 'pin pin-' + plot.id);
  pin.type = 'button';
  pin.dataset.plot = plot.id;
  pin.setAttribute('aria-label', plot.name + ', 토양 수분 ' + plot.moisture + '%');
  pin.append(node('b', plot.id), node('span', plot.name), node('small', plot.moisture + '%'));
  pin.addEventListener('click', () => { plotSelect.value = plot.id; setFeedback(''); renderSelectors(); });
  find('map-pins').append(pin);
});
rovers.forEach((rover) => option(roverSelect, rover.id, rover.name));

function occupied(rover) {
  return records.some((item) => item.rover === rover.id && ['queued', 'active'].includes(item.stage));
}
function renderSelectors() {
  const plot = plots.find((item) => item.id === plotSelect.value);
  const rover = rovers.find((item) => item.id === roverSelect.value);
  const roverStatus = occupied(rover) ? '작업 배정됨' : roverLabels[rover.status];
  for (const pin of find('map-pins').children) pin.setAttribute('aria-pressed', pin.dataset.plot === plot.id ? 'true' : 'false');
  const detail = find('plot-detail');
  detail.replaceChildren(node('strong', plot.location), node('span', '토양 수분 ' + plot.moisture + '%', 'moisture ' + plot.color));
  find('rover-meta').replaceChildren(node('strong', roverStatus), node('span', '배터리 ' + rover.battery + '%'),
    node('span', '물탱크 ' + rover.tank + '%'), node('span', rover.location));
  for (const item of roverSelect.options) {
    const device = rovers.find((candidate) => candidate.id === item.value);
    item.textContent = device.name + ' · ' + (occupied(device) ? '작업 배정됨' : roverLabels[device.status]);
  }
}
const verbs = { active: '모의 시작', done: '완료 처리', cancelled: '취소' };
function renderHistory() {
  const filter = find('filter').value;
  const list = find('missions');
  list.replaceChildren();
  const chosen = records.filter((item) => filter === 'all' || item.stage === filter);
  if (!chosen.length) list.append(node('li', '이 상태의 작업이 없어요.', 'empty'));
  for (const record of chosen) {
    const plot = plots.find((item) => item.id === record.plot);
    const rover = rovers.find((item) => item.id === record.rover);
    const row = node('li', null, 'record');
    const contents = node('div', null, 'record-content');
    contents.append(node('strong', plot.name), node('span', rover.name + ' · ' + record.minutes + '분 · ' + format.format(new Date(record.timestamp))));
    const actions = node('div', null, 'actions');
    const next = record.stage === 'queued' ? ['active', 'cancelled'] : record.stage === 'active' ? ['done', 'cancelled'] : [];
    actions.append(node('span', stageLabels[record.stage], 'state ' + record.stage));
    next.forEach((stage) => {
      const action = node('button', verbs[stage], 'secondary');
      action.type = 'button';
      action.dataset.id = record.id;
      action.dataset.stage = stage;
      action.setAttribute('aria-label', plot.name + ' · ' + verbs[stage]);
      action.addEventListener('click', () => {
        const change = moveMission(records, record.id, stage);
        if (change.error) {
          find('history-feedback').textContent = change.error;
          return;
        }
        const warning = save(change.records);
        find('history-feedback').textContent = plot.name + ' 작업이 ' + stageLabels[stage] + ' 상태가 됐어요.' + warning;
        if (warning) setFeedback(warning.trim(), true);
        const follow = [...list.querySelectorAll('button')].find((button) => button.dataset.id === record.id);
        (follow ?? find('filter')).focus();
      });
      actions.append(action);
    });
    row.append(contents, actions);
    list.append(row);
  }
}
function renderAll() {
  find('ready-count').textContent = String(rovers.filter((item) => item.status === 'ready' && !occupied(item)).length).padStart(2, '0');
  find('open-count').textContent = String(records.filter((item) => ['queued', 'active'].includes(item.stage)).length).padStart(2, '0');
  renderSelectors();
  renderHistory();
}

find('mission-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const result = addMission(records, Object.fromEntries(new FormData(event.currentTarget)));
  if (result.error) { setFeedback(result.error, true); return; }
  find('filter').value = 'all';
  const warning = save(result.records);
  setFeedback('작업을 대기 목록에 추가했어요.' + warning, Boolean(warning));
});
[plotSelect, roverSelect].forEach((select) => select.addEventListener('change', () => { setFeedback(''); renderSelectors(); }));
find('filter').addEventListener('change', renderHistory);
window.addEventListener('storage', (event) => {
  if (event.key !== key) return;
  records = loadMissions(event.newValue);
  renderAll();
});
if (!durable) setFeedback('브라우저 저장을 사용할 수 없어 이 탭에서만 작업을 유지해요.', true);
renderAll();
