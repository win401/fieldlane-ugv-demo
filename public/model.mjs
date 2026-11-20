export const plots = [
  { id: 'A1', name: '북쪽 과수열', moisture: 21, location: '북서 / A1', color: 'dry' },
  { id: 'B2', name: '동쪽 모종밭', moisture: 36, location: '북동 / B2', color: 'good' },
  { id: 'C3', name: '남쪽 시험포', moisture: 28, location: '남서 / C3', color: 'good' },
  { id: 'D4', name: '물길 완충지', moisture: 48, location: '남동 / D4', color: 'wet' }
];

export const rovers = [
  { id: 'L01', name: '라크 01', status: 'ready', battery: 87, tank: 74, location: '작업 대기 지점' },
  { id: 'K02', name: '카이트 02', status: 'charging', battery: 32, tank: 52, location: '충전소' },
  { id: 'S03', name: '스위프트 03', status: 'ready', battery: 71, tank: 43, location: '남쪽 시험포' }
];
export const roverLabels = { ready: '대기 중', charging: '충전 중' };
export const stageLabels = { queued: '대기', active: '진행 중', done: '완료', cancelled: '취소' };

export const sampleHistory = [
  { id: 'sample-02', plot: 'C3', rover: 'S03', minutes: 8, stage: 'done', timestamp: '2026-05-19T01:46:00Z' },
  { id: 'sample-01', plot: 'B2', rover: 'L01', minutes: 6, stage: 'done', timestamp: '2026-05-19T01:21:00Z' }
];

export function addMission(records, form, { id, now } = {}) {
  const plot = plots.find((item) => item.id === form.plot);
  const rover = rovers.find((item) => item.id === form.rover);
  const minutes = Number(form.minutes);
  if (!plot || !rover) return { error: '구역과 장비를 선택해 주세요.' };
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 30)
    return { error: '작업 시간은 1~30분 사이의 정수로 입력해 주세요.' };
  if (rover.status !== 'ready') return { error: '충전 중인 장비는 작업을 등록할 수 없어요.' };
  if (records.some((item) => item.rover === rover.id && ['queued', 'active'].includes(item.stage)))
    return { error: '이 장비에 아직 끝나지 않은 작업이 있어요.' };
  if (records.length >= 200) return { error: '이 브라우저에 저장할 수 있는 기록 한도에 도달했어요.' };
  return { records: [{ id: id ?? globalThis.crypto.randomUUID(), plot: plot.id, rover: rover.id, minutes,
    stage: 'queued', timestamp: (now ?? new Date()).toISOString() }, ...records] };
}

export function moveMission(records, id, next) {
  const record = records.find((item) => item.id === id);
  const allowed = { queued: ['active', 'cancelled'], active: ['done', 'cancelled'] };
  if (!record || !allowed[record.stage]?.includes(next)) return { error: '이미 처리됐거나 바꿀 수 없는 작업이에요.' };
  return { records: records.map((item) => item.id === id ? { ...item, stage: next } : item) };
}

export function loadMissions(raw) {
  if (raw == null) return [...sampleHistory];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...sampleHistory];
    const ids = new Set();
    return parsed.slice(0, 200).filter((item) => {
      if (!item || typeof item.id !== 'string' || ids.has(item.id) || !/^[a-z0-9-]{1,64}$/i.test(item.id) ||
        !plots.some((plot) => plot.id === item.plot) || !rovers.some((rover) => rover.id === item.rover) ||
        !Number.isInteger(item.minutes) || item.minutes < 1 || item.minutes > 30 ||
        !Object.hasOwn(stageLabels, item.stage) || typeof item.timestamp !== 'string' ||
        !Number.isFinite(Date.parse(item.timestamp))) return false;
      ids.add(item.id);
      return true;
    });
  } catch { return [...sampleHistory]; }
}
