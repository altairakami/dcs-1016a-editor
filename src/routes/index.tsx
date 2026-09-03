import { render } from "solid-js/web";
import { createSignal } from "solid-js";
import { onMount, onCleanup } from "solid-js";

type State = { sname: string; x: number; y: number };
type Transition = { s0: string; s1: string; symbol: string };

export default function Home() {
  let canvas;
  let animationId;
  let count = 1;
  let states: State[] = [
    { sname: "s0", x: 100, y: 100 },
    { sname: "s1", x: 300, y: 100 },
  ];
  const [step, setStep] = createSignal(1);
  const [stateInput, setStateInput] = createSignal("s0,100,100;");
  let transitions: Transition[] = [
    { s0: "s0", s1: "s1", symbol: "a" },
    { s0: "s0", s1: "s1", symbol: "b" },
  ];
  const [alphabet, setAlphabet] = createSignal(["a", "b"]);
  const [initial, setInitial] = createSignal("s0");
  const [transitionInput, setTransitionInput] =
    createSignal("s0,s1,a;s0,s3,b;");

  const [curr, setCurr] = createSignal("");
  const [word, setWord] = createSignal("");
  const [acc, setAcc] = createSignal(["s1"]);

  // Helper function for delay
  function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function fsmRun() {
    setStep(1);
    // Build transition map
    const transitionMap = new Map<string, Map<string, string>>();

    // Initialize for all states
    for (const state of states) {
      transitionMap.set(state.sname, new Map());
    }

    // Fill in transitions
    for (const t of transitions) {
      const stateMap = transitionMap.get(t.s0);
      if (stateMap) {
        stateMap.set(t.symbol, t.s1);
      }
    }

    // Start from initial state
    let currentState = initial();
    setCurr(currentState);

    // Small delay to show initial state
    await delay(500);

    // Process word
    const wordStr = word();
    for (let i = 0; i < wordStr.length; i++) {
      const letter = wordStr[i];

      // Get transitions for current state
      const stateMap = transitionMap.get(currentState);
      if (!stateMap) {
        console.error(`State "${currentState}" not found`);
        return false;
      }

      // Check if transition exists
      if (!stateMap.has(letter)) {
        console.error(
          `No transition from "${currentState}" with symbol "${letter}"`,
        );
        setCurr(""); // Clear highlighting
        return false;
      }

      // Move to next state
      currentState = stateMap.get(letter)!;
      setCurr(currentState);

      // Wait half a second before next step
      setStep(step() + 1);
      await delay(500);
    }

    // Check if final state is accepting
    const isAccepted = acc().includes(currentState);
    console.log(
      `Final state: ${currentState}, ${isAccepted ? "Accepted ✅" : "Rejected ❌"}`,
    );

    // Highlight final state with a different color briefly
    if (isAccepted) {
      // Could add visual feedback here
    }

    return isAccepted;
  }

  onMount(() => {
    // Set canvas internal size to match its CSS display size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const ctx = canvas.getContext("2d");

    // Set font size relative to canvas size so text scales
    const fontSize = Math.min(canvas.width, canvas.height) / 10;
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let frameNumber = 0;

    function drawArrow(
      fromX: number,
      fromY: number,
      toX: number,
      toY: number,
      symbol: string,
    ) {
      const dx = toX - fromX;
      const dy = toY - fromY;
      const angle = Math.atan2(dy, dx);

      // Calculate distance between centers
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If states are overlapping or too close, don't draw
      if (distance < 10) return;

      // Offset from state centers (radius 40)
      const offset = 40;
      const startX = fromX + Math.cos(angle) * offset;
      const startY = fromY + Math.sin(angle) * offset;
      const endX = toX - Math.cos(angle) * offset;
      const endY = toY - Math.sin(angle) * offset;

      // Draw the line
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Draw arrowhead
      const arrowSize = 10;
      const headAngle = 0.5; // radians

      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - arrowSize * Math.cos(angle - headAngle),
        endY - arrowSize * Math.sin(angle - headAngle),
      );
      ctx.lineTo(
        endX - arrowSize * Math.cos(angle + headAngle),
        endY - arrowSize * Math.sin(angle + headAngle),
      );
      ctx.closePath();
      ctx.fill();

      // Draw symbol text in the middle of the arrow
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;

      // Offset text slightly perpendicular to arrow for readability
      const perpAngle = angle + Math.PI / 2;
      const textOffset = 15;
      const textX = midX + Math.cos(perpAngle) * textOffset;
      const textY = midY + Math.sin(perpAngle) * textOffset;

      ctx.fillStyle = "black";
      ctx.font = "16px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // White background for text readability
      const metrics = ctx.measureText(symbol);
      const padding = 4;
      ctx.fillStyle = "white";
      ctx.fillRect(
        textX - metrics.width / 2 - padding,
        textY - 10 - padding,
        metrics.width + padding * 2,
        20 + padding * 2,
      );

      ctx.fillStyle = "black";
      ctx.fillText(symbol, textX, textY);
    }
    function drawTransitions() {
      const transitionMap = new Map();

      for (const t of transitions) {
        const key = `${t.s0}->${t.s1}`;
        if (transitionMap.has(key)) {
          transitionMap.get(key).symbols.push(t.symbol);
        } else {
          transitionMap.set(key, {
            s0: t.s0,
            s1: t.s1,
            symbols: [t.symbol],
          });
        }
      }
      function drawSelfLoop(lx: number, ly: number, symbols: string[]) {
        const radius = 30;

        // Draw the loop arc
        ctx.beginPath();
        ctx.arc(lx + 40, ly - 40, 30, 0, 2 * Math.PI);
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw symbols near the loop
        const symbolText = symbols.join(", ");
        ctx.fillStyle = "black";
        ctx.font = "14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Position text above and to the right of the loop
        const textX = lx + radius + 25;
        const textY = ly - 30 - 10;

        // White background for text readability
        const metrics = ctx.measureText(symbolText);
        const padding = 4;
        ctx.fillStyle = "white";
        ctx.fillRect(
          textX - metrics.width / 2 - padding,
          textY - 10 - padding,
          metrics.width + padding * 2,
          20 + padding * 2,
        );

        ctx.fillStyle = "black";
        ctx.fillText(symbolText, textX, textY);
      }
      for (const [, merged] of transitionMap) {
        const fromState = states.find((s) => s.sname === merged.s0);
        const toState = states.find((s) => s.sname === merged.s1);

        if (fromState && toState) {
          const symbolText = merged.symbols.join(", ");

          // Check if it's a self-loop
          if (fromState.sname === toState.sname) {
            drawSelfLoop(fromState.x, fromState.y, merged.symbols);
          } else {
            drawArrow(
              fromState.x,
              fromState.y,
              toState.x,
              toState.y,
              symbolText,
            );
          }
        }
      }
    }
    function drawState(text: string, lx: number, ly: number) {
      ctx.beginPath();
      ctx.arc(lx, ly, 40, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fill();

      ctx.font = "32px Arial";

      ctx.fillStyle = "#000000";
      ctx.fillText(text, lx, ly);
    }

    function drawAcc(lx: number, ly: number) {
      ctx.beginPath();
      ctx.arc(lx, ly, 35, 0, 2 * Math.PI);
      ctx.stroke();
    }
    function drawInit(lx: number, ly: number) {
      // Draw an arrow or label pointing to the state
      ctx.beginPath();
      ctx.moveTo(lx - 80, ly);
      ctx.lineTo(lx - 45, ly);
      ctx.stroke();
      ctx.beginPath();

      ctx.moveTo(lx - 55, ly - 10);
      ctx.lineTo(lx - 45, ly);
      ctx.lineTo(lx - 55, ly + 10);
      ctx.stroke();
      // Or draw a triangle or different shape
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawTransitions();
      for (const s of states) {
        ctx.fillStyle = "#ffeeaa";
        if (s.sname == curr()) {
          ctx.fillStyle = "#aaffaa";
        }
        drawState(s.sname, s.x, s.y);
        if (s.sname == initial()) {
          drawInit(s.x, s.y);
        }
        if (acc().includes(s.sname)) {
          drawAcc(s.x, s.y);
        }
      }

      frameNumber++;
    }

    function loop() {
      ctx.lineWidth = 4;
      draw();
      animationId = requestAnimationFrame(loop);
    }

    loop();

    onCleanup(() => {
      cancelAnimationFrame(animationId);
    });
  });

  return (
    <main class="text-center text-white mx-auto bg-black">
      <section class="flex flex-row justify-center gap-[2vw] bg-red-700/40">
        <section class="w-[60vw] h-[100vh] bg-red-900/90">
          <section class="flex flex-col justify-center gap-[2vw] bg-red-700/40">
            <section class="w-[100%]  h-[10vh] justify-center align-center bg-white/5">
              <form
                onSubmit={(e) => e.preventDefault()}
                class="flex justify-center items-center"
              >
                <section class="w-[90%] mx-auto my-4 py-5 p-3 my-2  bg-yellow-600/30">
                  <input
                    class=" bg-white/80 text-red-700 px-2 border-3 border-gray-700"
                    value={word()}
                    onInput={(e) => {
                      setWord(e.target.value);
                    }}
                  />
                  <button
                    class=" bg-yellow-600/80 text-white px-2 border-3 border-gray-700"
                    onClick={() => {
                      fsmRun();
                    }}
                  >
                    run machine
                  </button>
                  <p>step: {step}</p>
                </section>
              </form>
            </section>
            <section class="w-[98%] h-[85vh] mx-auto flex items-center text-black  border-5 rounded-lg border-gray-700 bg-white">
              <canvas
                ref={canvas}
                class=" w-[100%] h-[100%] mx-auto  block cursor-crosshair touch-none"
              />
            </section>
          </section>
        </section>

        <section class="w-[39vw] h-[100vh] bg-red-800/70 text-left ">
          <form onSubmit={(e) => e.preventDefault()}>
            <section class="w-[90%] mx-auto p-3 my-2 bg-yellow-600/30 ">
              <p>Alphabet</p>
              <input
                class="w-[90%] bg-white/80 text-red-700 px-2 border-3 border-gray-700"
                value={alphabet()}
                onInput={(e) => {
                  setAlphabet(e.target.value.split(","));
                }}
              />
            </section>
            <section class="w-[90%] mx-auto p-3 my-2  bg-yellow-600/30">
              <p>States</p>
              <p>name,x,y;</p>

              <textarea
                class="w-[90%] min-h-[15vh] bg-white/80 text-red-700 px-2 border-3 border-gray-700"
                value={stateInput()}
                onInput={(e) => {
                  setStateInput(e.target.value);
                  // Parse input: format "s0,100,100; s1,300,100"
                  const parts = e.target.value
                    .split(";")
                    .filter((p) => p.trim());
                  const newStates = parts
                    .map((part) => {
                      const [sname, x, y] = part
                        .split(",")
                        .map((s) => s.trim());
                      // Skip if any field is missing
                      if (!sname || !x || !y) return null;
                      // Convert x and y to numbers
                      const numX = parseFloat(x);
                      const numY = parseFloat(y);
                      // Skip if not valid numbers
                      if (isNaN(numX) || isNaN(numY)) return null;
                      return { sname: sname.trim(), x: numX, y: numY };
                    })
                    .filter((t) => t !== null); // Remove null entries

                  // Only update if we have valid states
                  if (newStates.length > 0) {
                    states = newStates;
                    // Update count to match highest state number
                    const maxNum = newStates.reduce((max, s) => {
                      const num = parseInt(s.sname.replace("s", ""));
                      return num > max ? num : max;
                    }, 0);
                    count = maxNum;
                  }
                }}
              />
              <section class="w-[90%] mx-auto p-2 my-1  bg-yellow-600/50">
                <p>Initial State</p>
                <input
                  class="w-[90%] bg-white/80 text-red-700 px-2 border-3 border-gray-700"
                  value={initial()}
                  onInput={(e) => {
                    setInitial(e.target.value);
                  }}
                />
              </section>
              <section class="w-[90%] mx-auto p-2 my-1  bg-yellow-600/50">
                <p>Accept States</p>
                <input
                  class="w-[90%] bg-white/80 text-red-700 px-2 border-3 border-gray-700"
                  value={acc()}
                  onInput={(e) => {
                    setAcc(e.target.value.split(","));
                  }}
                />
              </section>
            </section>
            <section class="w-[90%] mx-auto  p-3 my-2  bg-yellow-600/30">
              <p>Transitions</p>
              <p>si,sj,sym;</p>

              <textarea
                class="w-[90%] min-h-[15vh] bg-white/80 text-red-700 px-2 border-3 border-gray-700"
                value={transitionInput()}
                onInput={(e) => {
                  setTransitionInput(e.target.value);
                  // Parse input: format "s0,s1,a; s1,s2,b"
                  const parts = e.target.value
                    .split(";")
                    .filter((p) => p.trim());
                  const newTransitions = parts
                    .map((part) => {
                      const [s0, s1, symbol] = part
                        .split(",")
                        .map((s) => s.trim());
                      return { s0, s1, symbol };
                    })
                    .filter((t) => t.s0 && t.s1 && t.symbol);

                  transitions = newTransitions;
                }}
              />
            </section>
          </form>
        </section>
      </section>
    </main>
  );
}
