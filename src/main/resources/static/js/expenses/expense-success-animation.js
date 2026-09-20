const SUCCESS_DURATION_MS = 5000;

let overlay = null;
let title = null;
let note = null;
let hideTimer = null;


/**
 * Creates the reusable Orange expense-save animation overlay.
 */
function createExpenseSuccessOverlay() {
    if (overlay) {
        return;
    }

    overlay = document.createElement('div');

    overlay.id = 'expenseSuccessOverlay';
    overlay.className = 'expense-success-overlay';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.hidden = true;

    overlay.innerHTML = `
        <div class="expense-success-content">
            <div
                class="expense-success-visual"
                aria-hidden="true"
            >
                <svg
                    class="expense-success-svg"
                    viewBox="0 0 320 320"
                    role="presentation"
                >
                    <defs>
                        <radialGradient
                            id="expenseOrangePeel"
                            cx="30%"
                            cy="23%"
                            r="82%"
                        >
                            <stop
                                offset="0%"
                                stop-color="#ffc75b"
                            />
                            <stop
                                offset="25%"
                                stop-color="#ff9a17"
                            />
                            <stop
                                offset="62%"
                                stop-color="#ff7000"
                            />
                            <stop
                                offset="100%"
                                stop-color="#d94a00"
                            />
                        </radialGradient>

                        <radialGradient
                            id="expenseOrangeFlesh"
                            cx="42%"
                            cy="35%"
                            r="78%"
                        >
                            <stop
                                offset="0%"
                                stop-color="#ffe58d"
                            />
                            <stop
                                offset="28%"
                                stop-color="#ffc241"
                            />
                            <stop
                                offset="68%"
                                stop-color="#ff8a16"
                            />
                            <stop
                                offset="100%"
                                stop-color="#ee6500"
                            />
                        </radialGradient>

                        <linearGradient
                            id="expenseOrangePith"
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="100%"
                        >
                            <stop
                                offset="0%"
                                stop-color="#fff8d9"
                            />
                            <stop
                                offset="100%"
                                stop-color="#ffd98a"
                            />
                        </linearGradient>

                        <linearGradient
                            id="expenseOrangeLeaf"
                            x1="10%"
                            y1="10%"
                            x2="90%"
                            y2="90%"
                        >
                            <stop
                                offset="0%"
                                stop-color="#83c647"
                            />
                            <stop
                                offset="55%"
                                stop-color="#559b36"
                            />
                            <stop
                                offset="100%"
                                stop-color="#2f712a"
                            />
                        </linearGradient>

                        <linearGradient
                            id="expenseOrangeLeafShine"
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="0%"
                        >
                            <stop
                                offset="0%"
                                stop-color="#ffffff"
                                stop-opacity="0"
                            />
                            <stop
                                offset="55%"
                                stop-color="#ffffff"
                                stop-opacity="0.38"
                            />
                            <stop
                                offset="100%"
                                stop-color="#ffffff"
                                stop-opacity="0"
                            />
                        </linearGradient>

                        <linearGradient
                            id="expenseOrangeCutGlow"
                            x1="0%"
                            y1="0%"
                            x2="0%"
                            y2="100%"
                        >
                            <stop
                                offset="0%"
                                stop-color="#fff9d8"
                                stop-opacity="0"
                            />
                            <stop
                                offset="18%"
                                stop-color="#fff9d8"
                            />
                            <stop
                                offset="50%"
                                stop-color="#ffd268"
                            />
                            <stop
                                offset="82%"
                                stop-color="#fff9d8"
                            />
                            <stop
                                offset="100%"
                                stop-color="#fff9d8"
                                stop-opacity="0"
                            />
                        </linearGradient>

                        <filter
                            id="expenseSuccessGlow"
                            x="-100%"
                            y="-100%"
                            width="300%"
                            height="300%"
                        >
                            <feGaussianBlur
                                stdDeviation="10"
                            />
                        </filter>

                        <filter
                            id="expenseSoftGlow"
                            x="-80%"
                            y="-80%"
                            width="260%"
                            height="260%"
                        >
                            <feGaussianBlur
                                stdDeviation="4"
                            />
                        </filter>
                    </defs>


                    <!-- Sparkles -->

                    <g class="expense-success-spark">
                        <path
                            d="
                                M73 93
                                L78 106
                                L91 111
                                L78 116
                                L73 129
                                L68 116
                                L55 111
                                L68 106
                                Z
                            "
                            fill="#ffbd4e"
                        />
                    </g>

                    <g class="expense-success-spark">
                        <path
                            d="
                                M247 96
                                L251 107
                                L262 111
                                L251 115
                                L247 126
                                L243 115
                                L232 111
                                L243 107
                                Z
                            "
                            fill="#ff9820"
                        />
                    </g>

                    <g class="expense-success-spark">
                        <path
                            d="
                                M79 222
                                L83 232
                                L93 236
                                L83 240
                                L79 250
                                L75 240
                                L65 236
                                L75 232
                                Z
                            "
                            fill="#ffd167"
                        />
                    </g>

                    <g class="expense-success-spark">
                        <path
                            d="
                                M241 216
                                L245 226
                                L255 230
                                L245 234
                                L241 244
                                L237 234
                                L227 230
                                L237 226
                                Z
                            "
                            fill="#ffad34"
                        />
                    </g>


                    <!-- Center success glow -->

                    <circle
                        class="expense-success-flash"
                        cx="160"
                        cy="160"
                        r="58"
                        fill="#ffd777"
                        filter="url(#expenseSuccessGlow)"
                    />


                    <!-- LEFT ORANGE HALF -->

                    <g class="expense-success-orange-left">
                        <path
                            d="
                                M160 64
                                C106 64 65 106 65 159
                                C65 212 106 254 160 254
                                Z
                            "
                            fill="url(#expenseOrangePeel)"
                        />

                        <path
                            d="
                                M150 77
                                C108 81 79 114 76 151
                            "
                            fill="none"
                            stroke="#ffd16b"
                            stroke-width="9"
                            stroke-linecap="round"
                            opacity="0.34"
                        />

                        <ellipse
                            cx="103"
                            cy="112"
                            rx="22"
                            ry="15"
                            fill="#fff6cf"
                            opacity="0.12"
                            transform="rotate(-26 103 112)"
                        />

                        <circle
                            cx="91"
                            cy="155"
                            r="3"
                            fill="#dd5100"
                            opacity="0.16"
                        />

                        <circle
                            cx="109"
                            cy="198"
                            r="2.6"
                            fill="#d95000"
                            opacity="0.14"
                        />

                        <circle
                            cx="125"
                            cy="91"
                            r="2.4"
                            fill="#fff0bb"
                            opacity="0.26"
                        />


                        <!-- Hidden until orange begins separating -->

                        <g
                            class="expense-success-interior-left"
                            opacity="0"
                        >
                            <path
                                d="
                                    M154 78
                                    C116 84 89 118 89 160
                                    C89 202 116 236 154 241
                                    Z
                                "
                                fill="url(#expenseOrangeFlesh)"
                                stroke="url(#expenseOrangePith)"
                                stroke-width="7"
                                stroke-linejoin="round"
                            />

                            <circle
                                cx="150"
                                cy="160"
                                r="8"
                                fill="#fff1bd"
                                opacity="0.92"
                            />

                            <path
                                d="
                                    M150 160 L107 111
                                    M150 160 L95 136
                                    M150 160 L94 160
                                    M150 160 L98 187
                                    M150 160 L112 213
                                    M150 160 L137 229
                                "
                                fill="none"
                                stroke="#ffd889"
                                stroke-width="2.3"
                                stroke-linecap="round"
                                opacity="0.8"
                            />

                            <path
                                d="
                                    M142 101
                                    C126 112 114 132 110 151
                                "
                                fill="none"
                                stroke="#fff2bd"
                                stroke-width="3"
                                stroke-linecap="round"
                                opacity="0.47"
                            />

                            <animate
                                attributeName="opacity"
                                values="0;0;0.2;1;1;1"
                                keyTimes="0;0.37;0.44;0.53;0.9;1"
                                dur="5s"
                                begin="indefinite"
                                fill="freeze"
                            />
                        </g>
                    </g>


                    <!-- RIGHT ORANGE HALF -->

                    <g class="expense-success-orange-right">
                        <path
                            d="
                                M160 64
                                C214 64 255 106 255 159
                                C255 212 214 254 160 254
                                Z
                            "
                            fill="url(#expenseOrangePeel)"
                        />

                        <path
                            d="
                                M170 77
                                C212 81 241 114 244 151
                            "
                            fill="none"
                            stroke="#ff9b23"
                            stroke-width="7"
                            stroke-linecap="round"
                            opacity="0.24"
                        />

                        <circle
                            cx="221"
                            cy="143"
                            r="3"
                            fill="#d74b00"
                            opacity="0.15"
                        />

                        <circle
                            cx="207"
                            cy="205"
                            r="2.8"
                            fill="#db4c00"
                            opacity="0.13"
                        />

                        <circle
                            cx="224"
                            cy="177"
                            r="2.3"
                            fill="#fff0b8"
                            opacity="0.2"
                        />


                        <!-- Hidden until orange begins separating -->

                        <g
                            class="expense-success-interior-right"
                            opacity="0"
                        >
                            <path
                                d="
                                    M166 78
                                    C204 84 231 118 231 160
                                    C231 202 204 236 166 241
                                    Z
                                "
                                fill="url(#expenseOrangeFlesh)"
                                stroke="url(#expenseOrangePith)"
                                stroke-width="7"
                                stroke-linejoin="round"
                            />

                            <circle
                                cx="170"
                                cy="160"
                                r="8"
                                fill="#fff1bd"
                                opacity="0.92"
                            />

                            <path
                                d="
                                    M170 160 L213 111
                                    M170 160 L225 136
                                    M170 160 L226 160
                                    M170 160 L222 187
                                    M170 160 L208 213
                                    M170 160 L183 229
                                "
                                fill="none"
                                stroke="#ffd889"
                                stroke-width="2.3"
                                stroke-linecap="round"
                                opacity="0.8"
                            />

                            <path
                                d="
                                    M178 101
                                    C194 112 206 132 210 151
                                "
                                fill="none"
                                stroke="#fff2bd"
                                stroke-width="3"
                                stroke-linecap="round"
                                opacity="0.47"
                            />

                            <animate
                                attributeName="opacity"
                                values="0;0;0.2;1;1;1"
                                keyTimes="0;0.37;0.44;0.53;0.9;1"
                                dur="5s"
                                begin="indefinite"
                                fill="freeze"
                            />
                        </g>


                        <!-- Stem -->

                        <path
                            d="
                                M165 73
                                C165 61 169 52 176 44
                            "
                            fill="none"
                            stroke="#6e772a"
                            stroke-width="8"
                            stroke-linecap="round"
                        />

                        <path
                            d="
                                M174 48
                                C197 30 231 34 250 52
                                C228 68 197 68 174 55
                                Z
                            "
                            fill="url(#expenseOrangeLeaf)"
                        />

                        <path
                            d="
                                M180 53
                                C199 49 220 47 241 51
                            "
                            fill="none"
                            stroke="#38772e"
                            stroke-width="2.2"
                            stroke-linecap="round"
                            opacity="0.9"
                        />

                        <path
                            d="
                                M187 49
                                C202 43 220 44 233 49
                            "
                            fill="none"
                            stroke="url(#expenseOrangeLeafShine)"
                            stroke-width="3"
                            stroke-linecap="round"
                            opacity="0.58"
                        />
                    </g>


                    <!-- Thin glowing cutting line -->

                    <rect
                        class="expense-success-cut"
                        x="158"
                        y="67"
                        width="4"
                        height="187"
                        rx="2"
                        fill="url(#expenseOrangeCutGlow)"
                        filter="url(#expenseSoftGlow)"
                    />

                    <rect
                        class="expense-success-cut"
                        x="159"
                        y="67"
                        width="2"
                        height="187"
                        rx="1"
                        fill="#fffbe4"
                    />
                </svg>
            </div>

            <div class="expense-success-copy">
                <h2
                    id="expenseSuccessTitle"
                    class="expense-success-title"
                ></h2>

                <p
                    id="expenseSuccessNote"
                    class="expense-success-note"
                ></p>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    title = overlay.querySelector(
        '#expenseSuccessTitle'
    );

    note = overlay.querySelector(
        '#expenseSuccessNote'
    );
}


/**
 * Starts SVG-only animation pieces.
 */
function startSvgAnimations() {
    if (!overlay) {
        return;
    }

    overlay
        .querySelectorAll('animate')
        .forEach((animation) => {
            try {
                animation.beginElement();
            } catch {
                // CSS animation still provides the main motion.
            }
        });
}


/**
 * Stops any pending hide timer.
 */
function clearHideTimer() {
    if (hideTimer === null) {
        return;
    }

    window.clearTimeout(hideTimer);
    hideTimer = null;
}


/**
 * Clears and hides the expense-save animation.
 */
export function resetExpenseSuccessAnimation() {
    clearHideTimer();

    if (!overlay) {
        return;
    }

    overlay.classList.remove('is-visible');

    overlay.setAttribute(
        'aria-hidden',
        'true'
    );

    overlay.hidden = true;

    if (title) {
        title.textContent = '';
    }

    if (note) {
        note.textContent = '';
    }
}


/**
 * Shows the five-second Orange split success animation.
 */
export function showExpenseSuccessAnimation(
    editing = false
) {
    createExpenseSuccessOverlay();
    clearHideTimer();

    title.textContent = editing
        ? 'Split updated!'
        : 'Split added!';

    note.textContent = editing
        ? 'Balances now reflect your changes.'
        : "Everyone's balances are updated.";

    overlay.classList.remove('is-visible');

    overlay.hidden = false;

    overlay.setAttribute(
        'aria-hidden',
        'false'
    );

    /*
     * Forces the browser to restart the CSS
     * animation every time the overlay opens.
     */
    void overlay.offsetWidth;

    overlay.classList.add('is-visible');

    startSvgAnimations();

    return new Promise((resolve) => {
        hideTimer = window.setTimeout(() => {
            overlay.classList.remove(
                'is-visible'
            );

            overlay.setAttribute(
                'aria-hidden',
                'true'
            );

            hideTimer = null;

            resolve();
        }, SUCCESS_DURATION_MS);
    });
}