document.addEventListener('DOMContentLoaded', () => {
    /* ─── Mobile Menu ─── */
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileOverlay = document.getElementById('mobileOverlay');
    const mobileLinks = mobileMenu.querySelectorAll('a');

    const toggleMenu = () => {
        mobileMenu.classList.toggle('active');
        mobileOverlay.classList.toggle('active');
    };
    hamburger.addEventListener('click', toggleMenu);
    mobileOverlay.addEventListener('click', toggleMenu);
    mobileLinks.forEach(l => l.addEventListener('click', toggleMenu));

    /* ─── Navbar Scroll ─── */
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 60);
    });

    /* ─── Active Nav Link ─── */
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-links a');
    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(s => {
            if (scrollY >= s.offsetTop - 200) current = s.id;
        });
        navLinks.forEach(l => {
            l.classList.toggle('active', l.getAttribute('href') === `#${current}`);
        });
    });

    /* ─── Scroll Reveal ─── */
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.anim-reveal').forEach(el => observer.observe(el));

    /* ─── Counter Animation ─── */
    const countObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseInt(el.dataset.count);
                let current = 0;
                const step = Math.ceil(target / 40);
                const timer = setInterval(() => {
                    current += step;
                    if (current >= target) { current = target; clearInterval(timer); }
                    el.textContent = current;
                }, 30);
                countObserver.unobserve(el);
            }
        });
    }, { threshold: 0.5 });
    document.querySelectorAll('.stat-number').forEach(el => countObserver.observe(el));

    /* ─── Cursor Glow ─── */
    const glow = document.getElementById('cursorGlow');
    if (window.innerWidth > 768) {
        document.addEventListener('mousemove', (e) => {
            glow.style.left = e.clientX + 'px';
            glow.style.top = e.clientY + 'px';
            glow.style.opacity = '1';
        });
    }

    /* ─── Terminal Typing Effect ─── */
    const typingEl = document.getElementById('typingText');
    const outputEl = document.getElementById('terminalOutput');

    const sequences = [
        {
            cmd: 'cat about.json',
            output: `{
  <span class="highlight">"name"</span>: "Shivam Gupta",
  <span class="highlight">"role"</span>: "Full-Stack Engineer",
  <span class="highlight">"location"</span>: "Jaipur, India",
  <span class="highlight">"focus"</span>: [
    <span class="accent">"Trading Systems"</span>,
    <span class="accent">"AI Agents"</span>,
    <span class="accent">"Real-Time Apps"</span>
  ],
  <span class="highlight">"repos"</span>: <span class="accent">55+</span>
}`
        },
        {
            cmd: 'ls projects/',
            output: `<span class="accent">smart-trading/</span>    <span class="highlight">28 algo strategies</span>
<span class="accent">ai-agent/</span>         <span class="highlight">autonomous dev agent</span>
<span class="accent">jarvis/</span>           <span class="highlight">voice-first AI (Tauri)</span>
<span class="accent">streamverse/</span>      <span class="highlight">NPM streaming SDK</span>
<span class="accent">copy-trading/</span>     <span class="highlight">signal-based trading</span>
<span class="accent">tailwind-ui-kit/</span>  <span class="highlight">component library</span>`
        },
        {
            cmd: 'echo $STACK',
            output: `<span class="accent">React</span> · <span class="accent">TypeScript</span> · <span class="accent">NestJS</span> · <span class="accent">Python</span>
<span class="accent">PostgreSQL</span> · <span class="accent">Redis</span> · <span class="accent">Docker</span> · <span class="accent">Tauri</span>
<span class="accent">WebRTC</span> · <span class="accent">Mediasoup</span> · <span class="accent">FastAPI</span> · <span class="accent">Qdrant</span>`
        }
    ];

    let seqIdx = 0;

    function typeCommand(text, callback) {
        let i = 0;
        typingEl.textContent = '';
        function tick() {
            if (i < text.length) {
                typingEl.textContent += text[i++];
                setTimeout(tick, 40 + Math.random() * 30);
            } else {
                setTimeout(callback, 300);
            }
        }
        tick();
    }

    function showOutput(html) {
        outputEl.innerHTML = '';
        outputEl.innerHTML = `<pre style="margin:0;white-space:pre-wrap;">${html}</pre>`;
    }

    function runSequence() {
        const seq = sequences[seqIdx];
        typeCommand(seq.cmd, () => {
            showOutput(seq.output);
            seqIdx = (seqIdx + 1) % sequences.length;
            setTimeout(() => {
                outputEl.innerHTML = '';
                runSequence();
            }, 4000);
        });
    }

    setTimeout(runSequence, 800);
});

/* ─── Copy Email (Say Hello button) ─── */
function copyEmail(btn) {
    const email = 'profile.shivam@gmail.com';
    const original = btn.innerHTML;

    navigator.clipboard.writeText(email).then(() => {
        btn.innerHTML = '<i class="fas fa-check"></i> Email Copied!';
        btn.style.background = '#34d399';
        setTimeout(() => {
            btn.innerHTML = original;
            btn.style.background = '';
        }, 2000);
    }).catch(() => {
        // Fallback: open mailto
        window.location.href = 'mailto:' + email;
    });
}
