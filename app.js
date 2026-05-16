const STORAGE_KEY = "treino-progressivo-v4";
const LEGACY_STORAGE_KEYS = ["treino-progressivo-v3"];

const defaultState = {
  activeProgramId: "atual",
  activeWorkoutId: "upper-a",
  draft: {},
  skipped: {},
  sessions: [],
  workouts: [
    {
      id: "upper-a",
      name: "Upper A",
      label: "base pesado",
      color: "#3f8cff",
      schedule: "Segunda",
      exercises: [
        exercise("supino-inclinado", "Supino inclinado", "Peito", 6, 10, "2 aquecimentos + 1 preparatória + 1 trabalho. Rest-pause leve"),
        exercise("crucifixo-maquina-cabo", "Crucifixo máquina/cabo", "Peito", 8, 12, "1 aquecimento + 2 trabalho"),
        exercise("remada-curvada", "Remada curvada", "Costas", 6, 10, "2 aquecimentos + 1 preparatória + 1 trabalho"),
        exercise("puxada-alta-pulley", "Puxada alta (pulley)", "Costas", 6, 10, "1 aquecimento + 2 trabalho"),
        exercise("desenvolvimento-ombro", "Desenvolvimento (ombro)", "Ombro", 6, 10, "1 aquecimento + 2 trabalho"),
        exercise("elevacao-lateral-a", "Elevação lateral", "Ombro", 8, 12, "Parcial na última série"),
        exercise("triceps-corda", "Tríceps corda", "Tríceps", 6, 10, "1 aquecimento + 2 trabalho"),
        exercise("rosca-direta", "Rosca direta", "Bíceps", 6, 10, "1 aquecimento + 2 trabalho")
      ]
    },
    {
      id: "perna",
      name: "Perna",
      label: "LCA + tornozelo",
      color: "#ff6b6b",
      schedule: "Quarta",
      exercises: [
        exercise("extensora", "Extensora", "Quadríceps", 12, 15, "2 aquecimentos + 2 trabalho. Controle total"),
        exercise("mesa-flexora", "Mesa flexora", "Posterior", 12, 15, "2 aquecimentos + 2 trabalho"),
        exercise("elevacao-pelvica", "Elevação pélvica (glúteo)", "Glúteo", 10, 15, "1 aquecimento + 2 trabalho"),
        exercise("abducao-quadril", "Abdução de quadril", "Estabilidade", 12, 15, "Máquina ou elástico"),
        exercise("panturrilha-sentado", "Panturrilha sentado", "Panturrilha", 12, 15, "2-3 trabalho"),
        exercise("leg-press-controlado", "Leg press leve e controlado", "Reabilitação", 10, 15, "Leve a moderado")
      ]
    },
    {
      id: "upper-b",
      name: "Upper B",
      label: "complementar",
      color: "#8b7cff",
      schedule: "Sexta",
      exercises: [
        exercise("supino-reto-maquina", "Supino reto ou máquina", "Peito", 6, 10, "2 aquecimentos + 1 preparatória + 1 trabalho"),
        exercise("crossover-crucifixo", "Crossover / crucifixo", "Peito", 8, 12, "1 aquecimento + 2 trabalho"),
        exercise("remada-maquina-baixa", "Remada máquina ou baixa", "Costas", 6, 10, "2 aquecimentos + 1 preparatória + 1 trabalho"),
        exercise("puxada-aberta-neutra", "Puxada aberta ou neutra", "Costas", 6, 10, "1 aquecimento + 2 trabalho"),
        exercise("elevacao-lateral-b", "Elevação lateral", "Ombro", 8, 12, "1 aquecimento + 2 trabalho"),
        exercise("triceps-testa-maquina", "Tríceps testa ou máquina", "Tríceps", 6, 10, "1 aquecimento + 2 trabalho"),
        exercise("rosca-alternada", "Rosca alternada", "Bíceps", 6, 10, "1 aquecimento + 2 trabalho"),
        exercise("abdomen", "Abdômen", "Core", 0, 0, "2-3 séries")
      ]
    }
  ]
};

let state = loadState();
let deferredInstallPrompt = null;
let editingRef = null;
let selectedProgressExerciseId = null;
let removeProgramConfirming = false;

const $ = (selector) => document.querySelector(selector);

function exercise(id, name, group, minReps, maxReps, note) {
  return { id, name, group, minReps, maxReps, note };
}

function cloneWorkouts(workouts) {
  return structuredClone(workouts);
}

function makeProgram(id, name, workouts) {
  return {
    id,
    name,
    workouts: cloneWorkouts(workouts)
  };
}


function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY) || LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
  if (!saved) return ensurePrograms(structuredClone(defaultState));
  try {
    const parsed = JSON.parse(saved);
    return ensurePrograms({ ...structuredClone(defaultState), ...parsed }, true);
  } catch {
    return ensurePrograms(structuredClone(defaultState));
  }
}

function ensurePrograms(nextState, cleanLegacy = false) {
  if (!nextState.programs?.length) {
    const baseWorkouts = nextState.workouts?.length ? nextState.workouts : defaultState.workouts;
    nextState.programs = [
      makeProgram("atual", "Meu treino atual", baseWorkouts)
    ];
    nextState.activeProgramId = "atual";
  }
  if (cleanLegacy) {
    const currentProgram = nextState.programs.find((program) => program.id === "atual") || nextState.programs[0];
    currentProgram.id = "atual";
    currentProgram.name = currentProgram.name || "Meu treino atual";
    nextState.programs = [currentProgram];
    nextState.activeProgramId = "atual";
  }
  if (!nextState.programs.some((program) => program.id === nextState.activeProgramId)) {
    nextState.activeProgramId = nextState.programs[0].id;
  }
  const workouts = getWorkoutsFrom(nextState);
  if (!workouts.some((workout) => workout.id === nextState.activeWorkoutId)) {
    nextState.activeWorkoutId = workouts[0]?.id || "";
  }
  nextState.draft ||= {};
  nextState.skipped ||= {};
  nextState.sessions ||= [];
  return nextState;
}

function getWorkoutsFrom(nextState) {
  const program = nextState.programs.find((item) => item.id === nextState.activeProgramId);
  return program?.workouts || [];
}

function getActiveProgram() {
  return state.programs.find((program) => program.id === state.activeProgramId) || state.programs[0];
}

function getWorkouts() {
  return getActiveProgram()?.workouts || [];
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function sessionBelongsToActiveProgram(session) {
  return session.programId ? session.programId === state.activeProgramId : state.activeProgramId === "atual";
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getActiveWorkout() {
  return getWorkouts().find((workout) => workout.id === state.activeWorkoutId) || getWorkouts()[0];
}

function getDraft(exerciseId) {
  const key = draftKey(exerciseId);
  if (!state.draft[key]) {
    state.draft[key] = [{ weight: "", reps: "" }];
  }
  return state.draft[key];
}

function setDraft(exerciseId, sets) {
  state.draft[draftKey(exerciseId)] = sets;
  saveState();
  renderTodayVolume();
}

function draftKey(exerciseId) {
  return `${todayKey()}-${state.activeWorkoutId}-${exerciseId}`;
}

function isSkipped(exerciseId) {
  return Boolean(state.skipped?.[draftKey(exerciseId)]);
}

function setSkipped(exerciseId, skipped) {
  const key = draftKey(exerciseId);
  if (!state.skipped) state.skipped = {};
  if (skipped) {
    state.skipped[key] = true;
    delete state.draft[key];
  } else {
    delete state.skipped[key];
    getDraft(exerciseId);
  }
  saveState();
  render();
}

function formatKg(value) {
  const number = Number(value) || 0;
  return `${number.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;
}

function calcSetVolume(set) {
  return (Number(set.weight) || 0) * (Number(set.reps) || 0);
}

function calcDraftVolume() {
  return Object.entries(state.draft)
    .filter(([key]) => key.startsWith(`${todayKey()}-${state.activeWorkoutId}`))
    .filter(([key]) => !state.skipped?.[key])
    .flatMap(([, sets]) => sets)
    .reduce((total, set) => total + calcSetVolume(set), 0);
}

function lastExerciseEntry(exerciseId) {
  return [...state.sessions]
    .filter(sessionBelongsToActiveProgram)
    .reverse()
    .flatMap((session) => session.exercises.map((item) => ({ ...item, date: session.date })))
    .filter((item) => !item.skipped)
    .find((item) => item.exerciseId === exerciseId);
}

function bestSet(sets) {
  return sets.reduce((best, set) => {
    const volume = calcSetVolume(set);
    return volume > calcSetVolume(best) ? set : best;
  }, { weight: 0, reps: 0 });
}

function entryVolume(entry) {
  return entry.sets.reduce((sum, set) => sum + calcSetVolume(set), 0);
}

function lastSetVolume(entry) {
  return calcSetVolume(entry.sets.at(-1) || {});
}

function lastSetLabel(entry) {
  const set = entry.sets.at(-1) || {};
  return `${Number(set.weight) || 0} x ${Number(set.reps) || 0}`;
}

function exerciseEntries(exerciseId) {
  return state.sessions
    .filter(sessionBelongsToActiveProgram)
    .flatMap((session) => session.exercises.map((entry) => ({ ...entry, date: session.date, sessionId: session.id })))
    .filter((entry) => entry.exerciseId === exerciseId && !entry.skipped);
}

function progressFor(exerciseId, sets) {
  const previous = lastExerciseEntry(exerciseId);
  if (!previous) return { label: "Novo", className: "" };
  const currentBest = bestSet(sets);
  const previousBest = bestSet(previous.sets);
  const currentVolume = sets.reduce((sum, set) => sum + calcSetVolume(set), 0);
  const previousVolume = previous.sets.reduce((sum, set) => sum + calcSetVolume(set), 0);
  if ((Number(currentBest.weight) || 0) > (Number(previousBest.weight) || 0) || currentVolume > previousVolume) {
    return { label: "Subiu", className: "up" };
  }
  if ((Number(currentBest.weight) || 0) < (Number(previousBest.weight) || 0) && currentVolume < previousVolume) {
    return { label: "Caiu", className: "down" };
  }
  return { label: "Manteve", className: "" };
}

function render() {
  renderProgramChooser();
  renderWeek();
  renderWorkoutTabs();
  renderExercises();
  renderTodayVolume();
  renderProgress();
  renderHistory();
  renderEdit();
}

function renderProgramChooser() {
  const select = $("#todayProgramSelect");
  if (!select) return;
  select.innerHTML = state.programs.map((program) => `
    <option value="${program.id}" ${program.id === state.activeProgramId ? "selected" : ""}>${escapeHtml(program.name)}</option>
  `).join("");
  select.onchange = (event) => setActiveProgram(event.target.value);
}

function renderWeek() {
  const strip = $("#weekStrip");
  strip.innerHTML = getWorkouts().map((workout) => `
    <button class="day-pill" style="border:1px solid ${workout.color}" data-workout="${workout.id}" type="button">
      <strong>${workout.schedule || "Dia"}</strong>
      <span>${workout.name}</span>
    </button>
  `).join("");
  strip.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeWorkoutId = button.dataset.workout;
      saveState();
      render();
    });
  });
}

function renderWorkoutTabs() {
  const active = getActiveWorkout();
  $("#workoutTabs").innerHTML = getWorkouts().map((workout) => `
    <button class="chip ${workout.id === active.id ? "active" : ""}" style="color:${workout.color}" data-id="${workout.id}" type="button">
      ${workout.name}
    </button>
  `).join("");
  $("#workoutTabs").querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeWorkoutId = button.dataset.id;
      saveState();
      render();
    });
  });
}

function renderExercises() {
  const workout = getActiveWorkout();
  $("#exerciseList").innerHTML = workout.exercises.map((item) => {
    const skipped = isSkipped(item.id);
    const sets = skipped ? [] : getDraft(item.id);
    const progress = skipped ? { label: "Não fiz", className: "" } : progressFor(item.id, sets);
    const target = item.minReps && item.maxReps ? `${item.minReps}-${item.maxReps} reps` : "livre";
    return `
      <article class="exercise-card" style="--accent:${workout.color}">
        <div class="exercise-head">
          <div class="exercise-title">
            <strong>${escapeHtml(item.name)}</strong>
            <span>${escapeHtml(item.group)} - ${target} - ${escapeHtml(item.note || "")}</span>
          </div>
          <span class="progress-badge ${progress.className}">${progress.label}</span>
        </div>
        ${skipped ? `
          <div class="skip-panel">
            <strong>Exercício marcado como não feito neste treino.</strong>
            <span>Ele ficará salvo no histórico sem carga e sem repetição.</span>
          </div>
          <div class="exercise-actions">
            <button class="ghost unskip-exercise" data-exercise="${item.id}" type="button">Fiz este exercício</button>
          </div>
        ` : `
          <div class="sets" data-exercise="${item.id}">
            ${sets.map((set, index) => setRow(item.id, set, index)).join("")}
          </div>
          <div class="exercise-actions">
            <button class="ghost add-set" data-exercise="${item.id}" type="button">Adicionar série</button>
            <button class="ghost copy-last" data-exercise="${item.id}" type="button">Usar último</button>
            <button class="ghost skip-exercise" data-exercise="${item.id}" type="button">Não fiz</button>
          </div>
        `}
      </article>
    `;
  }).join("");

  $("#exerciseList").querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", updateSetFromInput);
  });
  $("#exerciseList").querySelectorAll(".remove-set").forEach((button) => {
    button.addEventListener("click", removeSet);
  });
  $("#exerciseList").querySelectorAll(".add-set").forEach((button) => {
    button.addEventListener("click", addSet);
  });
  $("#exerciseList").querySelectorAll(".copy-last").forEach((button) => {
    button.addEventListener("click", copyLast);
  });
  $("#exerciseList").querySelectorAll(".skip-exercise").forEach((button) => {
    button.addEventListener("click", () => setSkipped(button.dataset.exercise, true));
  });
  $("#exerciseList").querySelectorAll(".unskip-exercise").forEach((button) => {
    button.addEventListener("click", () => setSkipped(button.dataset.exercise, false));
  });
}

function setRow(exerciseId, set, index) {
  return `
    <div class="set-row">
      <div class="set-index">${index + 1}</div>
      <label>
        Carga
        <input data-exercise="${exerciseId}" data-index="${index}" data-field="weight" inputmode="decimal" type="number" min="0" step="0.5" value="${escapeHtml(set.weight)}">
      </label>
      <label>
        Reps
        <input data-exercise="${exerciseId}" data-index="${index}" data-field="reps" inputmode="numeric" type="number" min="0" value="${escapeHtml(set.reps)}">
      </label>
      <button class="set-action remove-set" data-exercise="${exerciseId}" data-index="${index}" type="button">x</button>
    </div>
  `;
}

function updateSetFromInput(event) {
  const { exercise, index, field } = event.target.dataset;
  const sets = getDraft(exercise);
  sets[Number(index)][field] = event.target.value;
  setDraft(exercise, sets);
}

function addSet(event) {
  const exerciseId = event.currentTarget.dataset.exercise;
  const sets = getDraft(exerciseId);
  const previous = sets[sets.length - 1] || { weight: "", reps: "" };
  sets.push({ weight: previous.weight || "", reps: "" });
  setDraft(exerciseId, sets);
  renderExercises();
}

function removeSet(event) {
  const exerciseId = event.currentTarget.dataset.exercise;
  const index = Number(event.currentTarget.dataset.index);
  const sets = getDraft(exerciseId).filter((_, itemIndex) => itemIndex !== index);
  setDraft(exerciseId, sets.length ? sets : [{ weight: "", reps: "" }]);
  renderExercises();
}

function copyLast(event) {
  const exerciseId = event.currentTarget.dataset.exercise;
  const last = lastExerciseEntry(exerciseId);
  if (!last) {
    toast("Ainda não existe treino anterior desse exercício.");
    return;
  }
  setDraft(exerciseId, last.sets.map((set) => ({ weight: set.weight, reps: set.reps })));
  renderExercises();
  toast("Último treino carregado.");
}

function renderTodayVolume() {
  $("#todayVolume").textContent = formatKg(calcDraftVolume());
}

function finishSession() {
  const workout = getActiveWorkout();
  const exercises = workout.exercises.map((item) => {
    if (isSkipped(item.id)) {
      return {
        exerciseId: item.id,
        name: item.name,
        group: item.group,
        skipped: true,
        sets: []
      };
    }
    const sets = getDraft(item.id).filter((set) => Number(set.weight) > 0 || Number(set.reps) > 0);
    return {
      exerciseId: item.id,
      name: item.name,
      group: item.group,
      sets
    };
  }).filter((item) => item.skipped || item.sets.length);

  if (!exercises.length) {
    toast("Registre uma série ou marque algum exercício como não feito.");
    return;
  }

  state.sessions.push({
    id: crypto.randomUUID(),
    date: todayKey(),
    programId: state.activeProgramId,
    programName: getActiveProgram().name,
    workoutId: workout.id,
    workoutName: workout.name,
    exercises
  });

  Object.keys(state.draft).forEach((key) => {
    if (key.startsWith(`${todayKey()}-${workout.id}`)) delete state.draft[key];
  });
  Object.keys(state.skipped || {}).forEach((key) => {
    if (key.startsWith(`${todayKey()}-${workout.id}`)) delete state.skipped[key];
  });

  const workouts = getWorkouts();
  const currentIndex = workouts.findIndex((item) => item.id === workout.id);
  const nextWorkout = workouts[(currentIndex + 1) % workouts.length];
  state.activeWorkoutId = nextWorkout.id;

  saveState();
  render();
  toast(`Treino salvo. Próximo: ${nextWorkout.name}.`);
}

function clearToday() {
  const workout = getActiveWorkout();
  Object.keys(state.draft).forEach((key) => {
    if (key.startsWith(`${todayKey()}-${workout.id}`)) delete state.draft[key];
  });
  Object.keys(state.skipped || {}).forEach((key) => {
    if (key.startsWith(`${todayKey()}-${workout.id}`)) delete state.skipped[key];
  });
  saveState();
  render();
  toast("Registro de hoje limpo.");
}

function renderProgress() {
  const filter = $("#progressWorkoutFilter");
  const current = filter.value || "all";
  filter.innerHTML = `<option value="all">Todos</option>${getWorkouts().map((workout) => `<option value="${workout.id}">${workout.name}</option>`).join("")}`;
  filter.value = current;

  const exerciseRows = getWorkouts()
    .filter((workout) => current === "all" || workout.id === current)
    .flatMap((workout) => workout.exercises.map((item) => ({ ...item, workoutId: workout.id, workoutName: workout.name, color: workout.color })));

  if (selectedProgressExerciseId && !exerciseRows.some((item) => item.id === selectedProgressExerciseId)) {
    selectedProgressExerciseId = null;
  }

  let improving = 0;
  $("#progressList").innerHTML = exerciseRows.map((item) => {
    const entries = exerciseEntries(item.id);
    const last = entries.at(-1);
    const previous = entries.at(-2);
    const bestWeight = Math.max(0, ...entries.flatMap((entry) => entry.sets.map((set) => Number(set.weight) || 0)));
    const bestVolume = Math.max(0, ...entries.map(entryVolume));
    const expanded = selectedProgressExerciseId === item.id;
    let status = "Sem dados";
    let statusClass = "";
    if (last && previous) {
      const lastVol = entryVolume(last);
      const prevVol = entryVolume(previous);
      if (lastVol > prevVol) {
        status = "Subindo";
        statusClass = "up";
        improving += 1;
      } else if (lastVol < prevVol) {
        status = "Caiu";
        statusClass = "down";
      } else {
        status = "Estável";
      }
    } else if (last) {
      status = "Novo";
    }
    return `
      <article class="history-card progress-card ${expanded ? "expanded" : ""}" style="border-left:5px solid ${item.color}" data-progress-exercise="${item.id}">
        <div class="history-head">
          <div>
            <strong>${escapeHtml(item.name)}</strong>
            <div class="muted">${escapeHtml(item.workoutName)} - ${escapeHtml(item.group)}</div>
          </div>
          <span class="progress-badge ${statusClass}">${status}</span>
        </div>
        <div class="progress-detail">
          <div class="mini-stat"><strong>${formatKg(bestWeight)}</strong><span>melhor carga</span></div>
          <div class="mini-stat"><strong>${formatKg(bestVolume)}</strong><span>melhor volume</span></div>
          <div class="mini-stat"><strong>${entries.length}</strong><span>registros</span></div>
        </div>
        ${expanded ? renderExerciseChart(entries) : ""}
      </article>
    `;
  }).join("") || `<div class="empty">Sem exercícios para mostrar.</div>`;

  $("#progressList").querySelectorAll("[data-progress-exercise]").forEach((card) => {
    card.addEventListener("click", () => {
      selectedProgressExerciseId = selectedProgressExerciseId === card.dataset.progressExercise ? null : card.dataset.progressExercise;
      renderProgress();
    });
  });

  const metricSessions = state.sessions
    .filter(sessionBelongsToActiveProgram)
    .filter((session) => current === "all" || session.workoutId === current);
  const bestSessionVolume = Math.max(0, ...metricSessions.map(sessionVolume));
  $("#totalSessions").textContent = metricSessions.length;
  $("#totalSessionsLabel").textContent = current === "all" ? "treinos salvos" : "vezes deste treino";
  $("#bestVolume").textContent = formatKg(bestSessionVolume);
  $("#progressCount").textContent = improving;
}

function renderExerciseChart(entries) {
  if (!entries.length) return `<div class="chart-empty">Sem registros para montar gráfico.</div>`;
  const points = entries.map((entry) => ({
    date: entry.date,
    total: entryVolume(entry),
    last: lastSetVolume(entry),
    lastLabel: lastSetLabel(entry)
  }));
  const maxValue = Math.max(1, ...points.flatMap((point) => [point.total, point.last]));
  const xFor = (index) => points.length === 1 ? 160 : 32 + (index * 256) / (points.length - 1);
  const yFor = (value) => 118 - (value / maxValue) * 82;
  const totalLine = points.map((point, index) => `${xFor(index)},${yFor(point.total)}`).join(" ");
  const lastLine = points.map((point, index) => `${xFor(index)},${yFor(point.last)}`).join(" ");
  const lastPoint = points.at(-1);
  return `
    <div class="exercise-chart">
      <div class="chart-legend">
        <span><i class="legend-total"></i>Volume total</span>
        <span><i class="legend-last"></i>Última série</span>
      </div>
      <svg viewBox="0 0 320 172" role="img" aria-label="Gráfico de evolução do exercício">
        <line x1="24" y1="118" x2="296" y2="118"></line>
        <line x1="24" y1="26" x2="24" y2="118"></line>
        <polyline class="line-total" points="${totalLine}"></polyline>
        <polyline class="line-last" points="${lastLine}"></polyline>
        ${points.map((point, index) => `
          <circle class="dot-total" cx="${xFor(index)}" cy="${yFor(point.total)}" r="3.5"></circle>
          <circle class="dot-last" cx="${xFor(index)}" cy="${yFor(point.last)}" r="3"></circle>
          <text class="chart-label total-label" x="${xFor(index)}" y="${Math.max(12, yFor(point.total) - 8)}">${formatKg(point.total)}</text>
          <text class="chart-label last-label" x="${xFor(index)}" y="${Math.min(134, yFor(point.last) + 16)}">${point.lastLabel}</text>
          <text class="chart-workout-label" x="${xFor(index)}" y="158">T${index + 1}</text>
        `).join("")}
      </svg>
      <div class="chart-summary">
        <span>Último: ${formatDate(lastPoint.date)}</span>
        <strong>Total ${formatKg(lastPoint.total)}</strong>
        <strong>Última ${lastPoint.lastLabel}</strong>
      </div>
    </div>
  `;
}

function renderHistory() {
  const list = $("#historyList");
  const sessions = state.sessions.filter(sessionBelongsToActiveProgram);
  if (!sessions.length) {
    list.innerHTML = `<div class="empty">Quando você finalizar um treino em ${escapeHtml(getActiveProgram().name)}, ele aparece aqui.</div>`;
    return;
  }
  list.innerHTML = [...sessions].reverse().map((session) => `
    <article class="history-card">
      <div class="history-head">
        <div>
          <strong>${formatDate(session.date)} - ${escapeHtml(session.workoutName)}</strong>
          <div class="muted">${escapeHtml(session.programName || getActiveProgram().name)} - ${formatElapsed(session.date)}</div>
        </div>
      </div>
      <div class="history-detail">
        <div class="mini-stat"><strong>${formatKg(sessionVolume(session))}</strong><span>volume</span></div>
        <div class="mini-stat"><strong>${session.exercises.reduce((sum, item) => sum + item.sets.length, 0)}</strong><span>séries</span></div>
        <div class="mini-stat"><strong>${session.exercises.filter((item) => item.skipped).length}</strong><span>não feitos</span></div>
      </div>
    </article>
  `).join("");
}

function renderEdit() {
  const program = getActiveProgram();
  $("#editList").innerHTML = `
    <article class="edit-card program-card">
      <div class="edit-head">
        <div>
          <strong>Rotinas salvas</strong>
          <div class="muted">Escolha entre seu treino atual, ABC, PPL ou crie outro.</div>
        </div>
      </div>
      <div class="program-fields">
        <label>
          Rotina ativa
          <select id="programSelect">
            ${state.programs.map((item) => `<option value="${item.id}" ${item.id === state.activeProgramId ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}
          </select>
        </label>
        <label>
          Nome da rotina
          <input id="programNameInput" value="${escapeHtml(program.name)}">
        </label>
      </div>
      <div class="program-actions">
        <button class="ghost compact" id="addWorkoutInProgramBtn" type="button">Adicionar treino</button>
        <button class="ghost compact ${removeProgramConfirming ? "danger" : ""}" id="removeProgramBtn" type="button">${removeProgramConfirming ? "Confirmar exclusão" : "Remover rotina"}</button>
      </div>
    </article>
  ` + getWorkouts().map((workout) => `
    <article class="edit-card" style="border-left:5px solid ${workout.color}">
      <div class="edit-head">
        <div>
          <strong>${escapeHtml(workout.name)}</strong>
          <div class="muted">${escapeHtml(workout.schedule || "")} - ${escapeHtml(workout.label || "")}</div>
        </div>
        <div class="edit-card-actions">
          <button class="ghost compact add-exercise" data-workout="${workout.id}" type="button">Adicionar exercício</button>
          <button class="ghost compact remove-workout" data-workout="${workout.id}" type="button">Remover treino</button>
        </div>
      </div>
      <div class="workout-fields">
        <label>
          Nome do treino
          <input class="workout-input" data-workout="${workout.id}" data-field="name" value="${escapeHtml(workout.name)}">
        </label>
        <label>
          Dia
          <input class="workout-input" data-workout="${workout.id}" data-field="schedule" value="${escapeHtml(workout.schedule || "")}">
        </label>
        <label>
          Foco
          <input class="workout-input" data-workout="${workout.id}" data-field="label" value="${escapeHtml(workout.label || "")}">
        </label>
      </div>
      <div class="edit-exercises">
        ${workout.exercises.map((item) => `
          <div class="edit-exercise">
            <div>
              <strong>${escapeHtml(item.name)}</strong>
              <div class="muted">${escapeHtml(item.group)} - ${item.minReps || "-"}-${item.maxReps || "-"} reps</div>
            </div>
            <div class="edit-buttons">
              <button class="tiny edit-exercise-btn" data-workout="${workout.id}" data-exercise="${item.id}" type="button">Ed</button>
              <button class="tiny remove-exercise-btn" data-workout="${workout.id}" data-exercise="${item.id}" type="button">x</button>
            </div>
          </div>
        `).join("")}
      </div>
    </article>
  `).join("");

  $("#programSelect").addEventListener("change", (event) => {
    setActiveProgram(event.target.value);
  });
  $("#programNameInput").addEventListener("input", (event) => {
    getActiveProgram().name = event.target.value || "Rotina sem nome";
    saveState();
  });
  $("#addWorkoutInProgramBtn").addEventListener("click", addWorkout);
  $("#removeProgramBtn").addEventListener("click", removeActiveProgram);
  $("#editList").querySelectorAll(".workout-input").forEach((input) => {
    input.addEventListener("input", () => {
      const workout = getWorkouts().find((item) => item.id === input.dataset.workout);
      workout[input.dataset.field] = input.value;
      saveState();
      renderWeek();
      renderWorkoutTabs();
    });
  });
  $("#editList").querySelectorAll(".add-exercise").forEach((button) => {
    button.addEventListener("click", () => openExerciseDialog(button.dataset.workout));
  });
  $("#editList").querySelectorAll(".remove-workout").forEach((button) => {
    button.addEventListener("click", () => removeWorkout(button.dataset.workout));
  });
  $("#editList").querySelectorAll(".edit-exercise-btn").forEach((button) => {
    button.addEventListener("click", () => openExerciseDialog(button.dataset.workout, button.dataset.exercise));
  });
  $("#editList").querySelectorAll(".remove-exercise-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const workout = getWorkouts().find((item) => item.id === button.dataset.workout);
      workout.exercises = workout.exercises.filter((item) => item.id !== button.dataset.exercise);
      saveState();
      render();
    });
  });
}

function openExerciseDialog(workoutId, exerciseId = null) {
  const workout = getWorkouts().find((item) => item.id === workoutId);
  const item = workout.exercises.find((exerciseItem) => exerciseItem.id === exerciseId);
  editingRef = { workoutId, exerciseId };
  $("#dialogTitle").textContent = item ? "Editar exercício" : `Novo exercício em ${workout.name}`;
  $("#exerciseName").value = item?.name || "";
  $("#exerciseGroup").value = item?.group || "";
  $("#exerciseMin").value = item?.minReps || "";
  $("#exerciseMax").value = item?.maxReps || "";
  $("#exerciseNote").value = item?.note || "";
  $("#editDialog").showModal();
}

function saveExercise(event) {
  event.preventDefault();
  const workout = getWorkouts().find((item) => item.id === editingRef.workoutId);
  const payload = {
    id: editingRef.exerciseId || crypto.randomUUID(),
    name: $("#exerciseName").value.trim(),
    group: $("#exerciseGroup").value.trim() || "Geral",
    minReps: Number($("#exerciseMin").value) || 0,
    maxReps: Number($("#exerciseMax").value) || 0,
    note: $("#exerciseNote").value.trim()
  };
  if (!payload.name) return;
  const index = workout.exercises.findIndex((item) => item.id === editingRef.exerciseId);
  if (index >= 0) workout.exercises[index] = payload;
  else workout.exercises.push(payload);
  saveState();
  $("#editDialog").close();
  render();
}

function addWorkout() {
  const workouts = getWorkouts();
  const count = workouts.length + 1;
  const workout = {
    id: crypto.randomUUID(),
    name: `Treino ${count}`,
    label: "personalizado",
    color: "#38c172",
    schedule: "Dia livre",
    exercises: []
  };
  workouts.push(workout);
  state.activeWorkoutId = workout.id;
  removeProgramConfirming = false;
  saveState();
  render();
}

function removeWorkout(workoutId) {
  const workouts = getWorkouts();
  if (workouts.length <= 1) {
    toast("Mantenha pelo menos um treino na programação.");
    return;
  }
  getActiveProgram().workouts = workouts.filter((workout) => workout.id !== workoutId);
  if (state.activeWorkoutId === workoutId) {
    state.activeWorkoutId = getWorkouts()[0].id;
  }
  Object.keys(state.draft).forEach((key) => {
    if (key.includes(`-${workoutId}-`)) delete state.draft[key];
  });
  Object.keys(state.skipped || {}).forEach((key) => {
    if (key.includes(`-${workoutId}-`)) delete state.skipped[key];
  });
  saveState();
  render();
}

function setActiveProgram(programId) {
  const program = state.programs.find((item) => item.id === programId);
  if (!program) return;
  state.activeProgramId = program.id;
  state.activeWorkoutId = program.workouts[0]?.id || "";
  removeProgramConfirming = false;
  saveState();
  render();
}

function addProgram(template) {
  const id = crypto.randomUUID();
  const program = makeProgram(id, "Nova rotina", [{
    id: crypto.randomUUID(),
    name: "Treino 1",
    label: "personalizado",
    color: "#38c172",
    schedule: "Dia livre",
    exercises: []
  }]);
  state.programs.push(program);
  state.activeProgramId = program.id;
  state.activeWorkoutId = program.workouts[0]?.id || "";
  removeProgramConfirming = false;
  saveState();
  render();
}

function removeActiveProgram() {
  if (state.programs.length <= 1) {
    toast("Mantenha pelo menos uma rotina salva.");
    return;
  }
  if (!removeProgramConfirming) {
    removeProgramConfirming = true;
    renderEdit();
    toast("Toque em Confirmar exclusão para remover a rotina.");
    return;
  }
  const removedId = state.activeProgramId;
  state.programs = state.programs.filter((program) => program.id !== removedId);
  state.activeProgramId = state.programs[0].id;
  state.activeWorkoutId = state.programs[0].workouts[0]?.id || "";
  removeProgramConfirming = false;
  saveState();
  render();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `treino-progressivo-${todayKey()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function sessionVolume(session) {
  return session.exercises.reduce((sum, item) => sum + item.sets.reduce((setSum, set) => setSum + calcSetVolume(set), 0), 0);
}

function formatDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function formatElapsed(value) {
  const start = new Date(`${value}T12:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  const days = Math.max(0, Math.floor((today - start) / 86400000));
  if (days === 0) return "feito hoje";
  if (days === 1) return "feito há 1 dia";
  if (days < 7) return `feito há ${days} dias`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    const rest = days % 7;
    const weekText = weeks === 1 ? "1 semana" : `${weeks} semanas`;
    if (!rest) return `feito há ${weekText}`;
    const dayText = rest === 1 ? "1 dia" : `${rest} dias`;
    return `feito há ${weekText} e ${dayText}`;
  }
  const months = Math.floor(days / 30);
  const restDays = days % 30;
  const monthText = months === 1 ? "1 mês" : `${months} meses`;
  if (restDays < 7) return `feito há ${monthText}`;
  const weeks = Math.floor(restDays / 7);
  const weekText = weeks === 1 ? "1 semana" : `${weeks} semanas`;
  return `feito há ${monthText} e ${weekText}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  window.setTimeout(() => element.classList.remove("show"), 2200);
}

function bindNavigation() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.view;
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item === button));
      document.querySelectorAll(".view").forEach((section) => section.classList.toggle("active", section.id === `view${view}`));
      $("#screenTitle").textContent = button.textContent.trim();
      renderProgress();
    });
  });
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  $("#installBtn").hidden = false;
});

$("#installBtn").addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  $("#installBtn").hidden = true;
});

$("#finishSessionBtn").addEventListener("click", finishSession);
$("#clearTodayBtn").addEventListener("click", clearToday);
$("#progressWorkoutFilter").addEventListener("change", renderProgress);
$("#exportBtn").addEventListener("click", exportData);
$("#addWorkoutBtn").addEventListener("click", () => addProgram("blank"));
$("#exerciseForm").addEventListener("submit", saveExercise);
$("#cancelEditBtn").addEventListener("click", () => $("#editDialog").close());

bindNavigation();
render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").then((registration) => registration.update());
  });
}
