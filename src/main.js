// Game Engine Variables
        let canvas, ctx;
        let width, height, horizonY;
        let baseFOV = 300, FOV = baseFOV;
        const roadWidth = 1400; 

        let state = 'START'; 
        let score = 0, baseSpeed = 15, gameSpeed = baseSpeed;
        let speedMultiplier = 1, throttle = 1, distance = 0, fallTimer = 0;
        let parallaxX = 0; 
        let speedWarningShown = false;

        const player = { x: 0, y: 0, z: 150, roadOffset: 0, yOffset: 0, speedX: 0, maxSpeedX: 45, curve: 0 };
        const camera = { x: 0, y: 0 }; 
        const keys = { left: false, right: false, up: false, down: false };

        let entities = [], particles = [], stars =[], buildings = [], mountains =[], groundStars =[];

        // Dialog Arrays (Sandra / 80s Pop Theme)
        const quotesStart =["In the heat of the night, let's ride!", "I'll be your Maria Magdalena.", "Welcome to the Secret Land.", "Neon highway awaits, darling."];
        const quotesOrb =["Everlasting love!", "Righteous!", "System upgraded.", "Heaven can wait!"];
        const quotesCrash =["Heartbeat... stopped.", "Shattered dreams.", "Fatal Error, darling."];
        const quotesFall =["Falling into the night!", "Hiroshima crash!", "You let me down..."];
        let msgTimeout;

        function showMessage(text, duration = 3000) {
            const comm = document.getElementById('commentator');
            const txt = document.getElementById('comic-text');
            txt.innerText = text;
            comm.classList.add('show');
            clearTimeout(msgTimeout);
            msgTimeout = setTimeout(() => { comm.classList.remove('show'); }, duration);
        }

        function getElevation(z) { return Math.sin(z * 0.001) * 150 + Math.sin(z * 0.003) * 60; }
        function getCurveCenter(z) { return Math.sin(z * 0.0004) * 2000 + Math.sin(z * 0.00015) * 1500; }
        function getWaveY(xOffset, zGlobal, time) {
            let dropDepth = 380; 
            let wave = Math.sin(zGlobal * 0.003 + time + xOffset * 0.002) * 90;
            return getElevation(zGlobal) + dropDepth + wave;
        }

        function project(x, y, z) {
            let pZ = FOV + z;
            if (pZ <= 0) pZ = 1; 
            const scale = FOV / pZ;
            return { x: (width / 2) + (x - camera.x) * scale, y: horizonY + (y - camera.y) * scale, scale: scale };
        }

        function resize() {
            width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight;
            horizonY = height * 0.45; 
        }

        function initGame() {
            canvas = document.getElementById('gameCanvas'); ctx = canvas.getContext('2d');
            window.addEventListener('resize', resize); resize();

            window.addEventListener('keydown', (e) => {
                if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
                if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
                if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = true;
                if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = true;
            });
            window.addEventListener('keyup', (e) => {
                if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
                if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
                if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = false;
                if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = false;
            });

            document.getElementById('startBtn').addEventListener('click', startGame);
            document.getElementById('restartBtn').addEventListener('click', startGame);

            generateScenery();
            loop();
        }

        function generateScenery() {
            for(let i = 0; i < 300; i++) {
                stars.push({ x: Math.random() * 8000 - 4000, y: Math.random() * 1000, size: Math.random() * 2 + 0.5, layer: Math.floor(Math.random() * 3) + 1, color: Math.random() > 0.85 ? '#ff00ff' : (Math.random() > 0.85 ? '#00f3ff' : '#ffffff')});
            }
            const cityWidth = 16000;
            for(let i = 0; i < 150; i++) { 
                let bType = Math.random(); let w = Math.random() * 50 + 30; let h = Math.random() * 120 + 80; 
                let wins =[];
                for(let wy = 15; wy < h - 15; wy += 12) {
                    for(let wx = 8; wx < w - 8; wx += 10) { if(Math.random() > 0.4) wins.push({x: wx, y: wy}); }
                }
                let type = 'block'; if(bType > 0.85) { type = 'empire'; h += 100; } else if(bType > 0.7) { type = 'stepped'; h += 60; }
                buildings.push({ x: Math.random() * cityWidth - cityWidth/2, w: w, h: h, type: type, color: Math.random() > 0.5 ? '#00f3ff' : '#ff007f', windows: wins });
            }
            let mx = -4000;
            while(mx < 4000) { mountains.push({ x: mx, y: Math.random() * 100 + 30 }); mx += 150 + Math.random() * 200; }
            for(let i=0; i<80; i++) { groundStars.push({ x: (Math.random() - 0.5) * 8000, yOff: Math.random() * 150 + 20, z: Math.random() * 4000, pulse: Math.random() * Math.PI * 2 }); }
        }

        function spawnEntity() {
            if(state !== 'PLAYING') return;
            const type = Math.random() > 0.65 ? 'orb' : 'obstacle';
            entities.push({ type: type, trackX: (Math.random() * roadWidth * 0.8) - (roadWidth * 0.4), z: 4000, active: true, pulse: Math.random() * Math.PI });
            if(Math.random() > 0.4) {
                let side = Math.random() > 0.5 ? 1 : -1;
                entities.push({ type: 'palm', trackX: side * (roadWidth / 2 + 500 + Math.random() * 800), z: 4000, active: true, pulse: 0 });
            }
            setTimeout(spawnEntity, Math.random() * 600 + (1000 / (speedMultiplier * throttle)));
        }

        // Retro Wave Sound Effects using Web Audio API
        let audioCtx = null;
        
        function getAudioContext() {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            return audioCtx;
        }
        
        function playRetroBleep() {
            const ctx = getAudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.1);
        }
        
        function playRetroCrash() {
            const ctx = getAudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
            
            // Add noise burst
            const bufferSize = ctx.sampleRate * 0.2;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.15, ctx.currentTime);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            noise.connect(noiseGain);
            noiseGain.connect(ctx.destination);
            noise.start(ctx.currentTime);
        }
        
        function playRetroSwoosh() {
            const ctx = getAudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
            osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        }

        function createExplosion(x, y, color) {
            for(let i=0; i<25; i++) { particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30, life: 1, color: color }); }
        }

        // Background music configuration
        const musicFiles = [
            'src/assets/Neon.mp3',
            'src/assets/Neon1.mp3'
        ];
        let backgroundMusic = null;
        let currentTrackIndex = 0;

        function createMusicPlayerUI() {
            const playerUI = document.createElement('div');
            playerUI.id = 'musicPlayer';
            playerUI.innerHTML = `
                <span style="color: #00f3ff; font-size: 10px; margin-right: 8px;">♫</span>
                <button id="prevTrack" style="background: transparent; border: 1px solid #00f3ff; color: #00f3ff; padding: 2px 6px; cursor: pointer; font-size: 10px;">◀</button>
                <button id="togglePlay" style="background: transparent; border: 1px solid #ff007f; color: #ff007f; padding: 2px 8px; cursor: pointer; font-size: 10px;">❚❚</button>
                <button id="nextTrack" style="background: transparent; border: 1px solid #00f3ff; color: #00f3ff; padding: 2px 6px; cursor: pointer; font-size: 10px;">▶</button>
            `;
            playerUI.style.cssText = 'position: fixed; top: 10px; left: 10px; z-index: 1000; display: flex; align-items: center; gap: 5px; background: rgba(0,0,0,0.7); padding: 5px 10px; border: 2px solid #ff007f; border-radius: 5px;';
            document.body.appendChild(playerUI);
            
            document.getElementById('prevTrack').addEventListener('click', playPrevTrack);
            document.getElementById('nextTrack').addEventListener('click', playNextTrack);
            document.getElementById('togglePlay').addEventListener('click', togglePlayPause);
        }

        function playTrack(index) {
            currentTrackIndex = index;
            if (currentTrackIndex < 0) currentTrackIndex = musicFiles.length - 1;
            if (currentTrackIndex >= musicFiles.length) currentTrackIndex = 0;
            
            const selectedMusic = musicFiles[currentTrackIndex];
            console.log('Playing track:', selectedMusic);
            
            if (backgroundMusic) {
                backgroundMusic.pause();
            }
            
            backgroundMusic = new Audio(selectedMusic);
            backgroundMusic.loop = true;
            backgroundMusic.volume = 0.5;
            
            backgroundMusic.addEventListener('play', function() {
                console.log('Audio started playing');
                document.getElementById('togglePlay').textContent = '❚❚';
            });
            
            backgroundMusic.play().catch(e => console.log('Play blocked:', e.message));
        }

        function playNextTrack() {
            playTrack(currentTrackIndex + 1);
        }

        function playPrevTrack() {
            playTrack(currentTrackIndex - 1);
        }

        function togglePlayPause() {
            if (backgroundMusic) {
                if (backgroundMusic.paused) {
                    backgroundMusic.play();
                } else {
                    backgroundMusic.pause();
                }
            }
        }

        function initMusic() {
            createMusicPlayerUI();
            // Start with random track
            currentTrackIndex = Math.floor(Math.random() * musicFiles.length);
            playTrack(currentTrackIndex);
        }

        function playRandomMusic() {
            playTrack(Math.floor(Math.random() * musicFiles.length));
        }

        // Initialize music on page load
        window.addEventListener('load', initMusic);

        function startGame() {
            state = 'PLAYING'; score = 0; speedMultiplier = 1; throttle = 1; distance = 0; parallaxX = 0; speedWarningShown = false;
            player.roadOffset = 0; player.speedX = 0; player.yOffset = 0; player.curve = 0;
            entities =[]; particles =[]; fallTimer = 0;
            
            document.getElementById('startScreen').style.display = 'none'; 
            document.getElementById('gameOverScreen').style.display = 'none';
            document.getElementById('hud').style.opacity = '1'; 
            document.body.classList.remove('hit-effect');
            
            showMessage(quotesStart[Math.floor(Math.random() * quotesStart.length)], 3000);
            spawnEntity();
        }

        function gameOver(x, y) {
            // Keep background music playing
            
            state = 'GAMEOVER'; document.getElementById('hud').style.opacity = '0'; 
            document.getElementById('finalScore').innerText = Math.floor(score);
            document.getElementById('gameOverScreen').style.display = 'block'; 
            document.body.classList.add('hit-effect');
            if(x && y) createExplosion(x, y, '#ff0000');
        }

        function update() {
            let currentRoadCenter = getCurveCenter(distance + player.z);
            let nextRoadCenter = getCurveCenter(distance + player.z + gameSpeed);
            let curveDelta = nextRoadCenter - currentRoadCenter; 

            if (state === 'PLAYING') {
                if (keys.left) player.speedX -= 3.5;
                if (keys.right) player.speedX += 3.5;
                
                player.speedX *= 0.82; 
                player.speedX = Math.max(-player.maxSpeedX, Math.min(player.maxSpeedX, player.speedX));
                
                player.roadOffset += player.speedX;
                let driftSpeed = throttle * 0.6; 
                player.roadOffset -= curveDelta * driftSpeed; 

                player.x = currentRoadCenter + player.roadOffset;
                player.curve = (player.speedX * 1.5) + (curveDelta * 0.8);
                
                if (keys.up) throttle += 0.05;
                else if (keys.down) throttle -= 0.05;
                else {
                    if (throttle > 1.0) throttle -= 0.02; if (throttle < 1.0) throttle += 0.02;
                    if (Math.abs(throttle - 1.0) < 0.03) throttle = 1.0;
                }
                throttle = Math.max(0.4, Math.min(2.5, throttle));

                speedMultiplier += 0.0003; 
                gameSpeed = baseSpeed * speedMultiplier * throttle;
                distance += gameSpeed; score += gameSpeed * 0.05; 
                FOV = baseFOV + (throttle - 1) * 60;

                let actualSpeed = speedMultiplier * throttle;
                if (actualSpeed > 2.8 && !speedWarningShown) {
                    showMessage("Careful, you'll melt the tires!", 2500); speedWarningShown = true;
                } else if (actualSpeed < 2.0) { speedWarningShown = false; }

                if (Math.abs(player.roadOffset) > (roadWidth / 2) + 40) {
                    state = 'FALLING'; showMessage(quotesFall[Math.floor(Math.random() * quotesFall.length)], 4000);
                }

                player.y = getElevation(distance + player.z);
                
                camera.x = player.x; camera.y = player.y - 130; 
                parallaxX -= (curveDelta * 0.7) + (player.speedX * 0.5);

                document.getElementById('scoreDisplay').innerText = Math.floor(score);
                document.getElementById('speedDisplay').innerText = actualSpeed.toFixed(1);

                for(let i = entities.length - 1; i >= 0; i--) {
                    let ent = entities[i];
                    ent.z -= gameSpeed; ent.pulse += 0.1;

                    if (ent.active && ent.z < player.z + 80 && ent.z > player.z - 80 && (ent.type === 'obstacle' || ent.type === 'orb')) {
                        let entAbsoluteX = getCurveCenter(distance + ent.z) + ent.trackX;
                        let hitDist = Math.abs(entAbsoluteX - player.x);
                        if (hitDist < 140) {
                            ent.active = false;
                            let hitY = getElevation(ent.z + distance);
                            let p = project(entAbsoluteX, hitY, ent.z);
                            
                            if (ent.type === 'obstacle') {
                                playRetroCrash();
                                showMessage(quotesCrash[Math.floor(Math.random() * quotesCrash.length)], 4000);
                                gameOver(p.x, p.y);
                            }
                            else if (ent.type === 'orb') { 
                                playRetroBleep();
                                score += 500; createExplosion(p.x, p.y, '#00f3ff'); 
                                showMessage(quotesOrb[Math.floor(Math.random() * quotesOrb.length)], 1500);
                            }
                        }
                    }
                    if (ent.z < -200) entities.splice(i, 1);
                }
            } 
            else if (state === 'FALLING') {
                fallTimer++; player.yOffset += 14; player.roadOffset += player.speedX; 
                player.x = currentRoadCenter + player.roadOffset; player.curve += 8; 
                gameSpeed *= 0.9; distance += gameSpeed;
                parallaxX -= (curveDelta * 0.7) + (player.speedX * 0.5);
                camera.x = player.x; camera.y = getElevation(distance + player.z) - 130; 
                if (fallTimer > 60) gameOver(null, null);
            }

            groundStars.forEach(s => {
                s.z -= gameSpeed;
                if (s.z < 0) { s.z = 4000; s.x = (Math.random() - 0.5) * 8000; s.pulse = Math.random() * Math.PI * 2; }
                s.pulse += 0.05;
            });

            for(let i = particles.length - 1; i >= 0; i--) {
                let p = particles[i]; p.x += p.vx; p.y += p.vy; p.life -= 0.05;
                if(p.life <= 0) particles.splice(i, 1);
            }
        }

        function drawEntity(ent, time) {
            let entY = (ent.type === 'palm') ? getWaveY(ent.trackX, ent.z + distance, time) : getElevation(ent.z + distance);
            let entX = getCurveCenter(ent.z + distance) + ent.trackX; 
            let p = project(entX, entY, ent.z);
            let size = 150 * p.scale;

            if (ent.type === 'obstacle') {
                let cX = p.x; let cY = p.y - size * 0.5; let t = Date.now() * 0.01;
                let doGlitch = Math.random() > 0.8;
                let gX = doGlitch ? (Math.random() - 0.5) * 20 * p.scale : 0; let gY = doGlitch ? (Math.random() - 0.5) * 20 * p.scale : 0;

                function drawC64(x, y, color, blur) {
                    ctx.strokeStyle = color; ctx.shadowBlur = blur; ctx.shadowColor = color;
                    ctx.lineWidth = Math.max(3, 14 * p.scale); ctx.lineCap = 'butt';
                    ctx.beginPath(); ctx.arc(x - size * 0.05, y, size * 0.4, Math.PI * 0.25, Math.PI * 1.75); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(x, y - size * 0.15); ctx.lineTo(x + size * 0.45, y - size * 0.15); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(x + size * 0.1, y + size * 0.15); ctx.lineTo(x + size * 0.45, y + size * 0.15); ctx.stroke();
                }
                if (doGlitch) { drawC64(cX + gX, cY + gY, '#00f3ff', 0); drawC64(cX - gX, cY - gY, '#ff00ff', 0); }
                drawC64(cX, cY, '#ff0000', 25);
                ctx.strokeStyle = '#ff0000'; ctx.lineWidth = Math.max(1, 3 * p.scale); ctx.beginPath();
                for(let a = 0; a <= Math.PI * 2; a += 0.4) {
                    let r = size * 0.55 + (Math.random() * size * 0.3);
                    let ax = cX + Math.cos(a + t) * r; let ay = cY + Math.sin(a + t) * r;
                    if(a === 0) ctx.moveTo(ax, ay); else ctx.lineTo(ax, ay);
                }
                ctx.closePath(); ctx.stroke();
            } else if (ent.type === 'orb') {
                let bounce = Math.sin(ent.pulse) * (30 * p.scale); let aX = p.x; let aY = p.y - size * 0.2 + bounce; 
                ctx.strokeStyle = '#00f3ff'; ctx.shadowBlur = 25; ctx.shadowColor = '#00f3ff';
                ctx.lineWidth = Math.max(3, 14 * p.scale); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                ctx.beginPath(); ctx.moveTo(aX, aY); ctx.lineTo(aX, aY - size * 0.8); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(aX - size * 0.4, aY); ctx.quadraticCurveTo(aX - size * 0.15, aY - size * 0.1, aX - size * 0.15, aY - size * 0.7); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(aX + size * 0.4, aY); ctx.quadraticCurveTo(aX + size * 0.15, aY - size * 0.1, aX + size * 0.15, aY - size * 0.7); ctx.stroke();
            } else if (ent.type === 'palm') {
                let cX = p.x; let cY = p.y; ctx.shadowBlur = 15; ctx.lineWidth = Math.max(2, 6 * p.scale);
                ctx.strokeStyle = '#ff00ff'; ctx.shadowColor = '#ff00ff'; ctx.beginPath(); ctx.moveTo(cX, cY); ctx.quadraticCurveTo(cX + size * 0.2, cY - size * 1.5, cX + size * 0.1, cY - size * 2.5); ctx.stroke();
                ctx.strokeStyle = '#00f3ff'; ctx.shadowColor = '#00f3ff'; let topX = cX + size * 0.1; let topY = cY - size * 2.5;
                for(let a = 0; a < Math.PI; a += Math.PI / 4) {
                    ctx.beginPath(); ctx.moveTo(topX, topY); ctx.quadraticCurveTo(topX + Math.cos(a) * size * 1.5, topY - Math.sin(a) * size * 1.5, topX + Math.cos(a) * size * 1.8, topY + Math.sin(a) * size * 0.5); ctx.stroke();
                }
            }
            ctx.shadowBlur = 0;
        }

        function draw() {
            ctx.clearRect(0, 0, width, height);
            let time = Date.now() * 0.002; 

            let skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY + 200);
            skyGrad.addColorStop(0, '#010006'); skyGrad.addColorStop(0.5, '#1a0033'); skyGrad.addColorStop(1, '#3b004a');
            ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, width, height); 

            stars.forEach(star => {
                let sx = (((star.x + parallaxX * 0.1 * star.layer) % 8000) + 8000) % 8000 - 4000;
                ctx.fillStyle = star.color; ctx.globalAlpha = Math.random() * 0.5 + 0.5;
                ctx.shadowBlur = star.color !== '#ffffff' ? 10 : 0; ctx.shadowColor = star.color;
                ctx.beginPath(); ctx.arc(sx + width/2, star.y, star.size, 0, Math.PI*2); ctx.fill();
            });
            ctx.globalAlpha = 1; ctx.shadowBlur = 0;

            ctx.strokeStyle = 'rgba(255, 0, 255, 0.15)'; ctx.lineWidth = 1; let skySpeed = (distance * 0.02) % 40;
            for(let i = 0; i < horizonY; i += 40) { let y = i + skySpeed; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }

            let sunRadius = Math.min(width, height) * 0.25;
            ctx.save(); ctx.translate(width / 2 + parallaxX * 0.15, horizonY); 
            ctx.shadowBlur = 40; ctx.shadowColor = '#ff007f';
            let sunGrad = ctx.createLinearGradient(0, -sunRadius, 0, sunRadius);
            sunGrad.addColorStop(0, '#ffcf00'); sunGrad.addColorStop(0.5, '#ff4000'); sunGrad.addColorStop(1, '#ff007f');
            ctx.fillStyle = sunGrad; ctx.beginPath(); ctx.arc(0, 0, sunRadius, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0; ctx.fillStyle = '#3b004a';
            for(let i = 0; i < sunRadius; i += 20) { let h = (i * 0.15) + 2; let offset = (distance * 0.05) % 20; ctx.fillRect(-sunRadius, i - offset, sunRadius * 2, h); }
            ctx.restore();

            ctx.save(); ctx.translate(width / 2, horizonY);
            ctx.strokeStyle = '#ff00ff'; ctx.lineWidth = 2; ctx.shadowBlur = 10; ctx.shadowColor = '#ff00ff'; ctx.beginPath();
            mountains.forEach((m, idx) => {
                let mx = (((m.x + parallaxX * 0.3) % 8000) + 8000) % 8000 - 4000;
                if(idx === 0) ctx.moveTo(mx, -m.y); else ctx.lineTo(mx, -m.y);
            });
            ctx.stroke(); ctx.shadowBlur = 0; ctx.restore();

            const cityWidth = 16000; ctx.save(); ctx.translate(width / 2, horizonY);
            buildings.forEach(b => {
                let bx = (((b.x + parallaxX * 0.5) % cityWidth) + cityWidth) % cityWidth - cityWidth/2;
                ctx.fillStyle = '#02000a'; ctx.strokeStyle = b.color; ctx.lineWidth = 1; ctx.beginPath();
                if (b.type === 'empire') {
                    ctx.rect(bx, -b.h*0.6, b.w, b.h*0.6 + 500); ctx.rect(bx + b.w*0.15, -b.h*0.85, b.w*0.7, b.h*0.25);
                    ctx.rect(bx + b.w*0.35, -b.h, b.w*0.3, b.h*0.15); ctx.moveTo(bx + b.w*0.5, -b.h); ctx.lineTo(bx + b.w*0.5, -b.h - 30);
                } else if (b.type === 'stepped') {
                    ctx.rect(bx, -b.h*0.5, b.w, b.h*0.5 + 500); ctx.rect(bx + b.w*0.2, -b.h*0.8, b.w*0.6, b.h*0.3); ctx.rect(bx + b.w*0.4, -b.h, b.w*0.2, b.h*0.2);
                } else { ctx.rect(bx, -b.h, b.w, b.h + 500); }
                ctx.fill(); ctx.stroke();

                ctx.fillStyle = 'rgba(255, 207, 0, 0.7)'; 
                b.windows.forEach(w => {
                    if (b.type === 'empire' && w.y > b.h*0.6 && (w.x < b.w*0.15 || w.x > b.w*0.85)) return;
                    if (b.type === 'empire' && w.y > b.h*0.85 && (w.x < b.w*0.35 || w.x > b.w*0.65)) return;
                    if (b.type === 'stepped' && w.y > b.h*0.5 && (w.x < b.w*0.2 || w.x > b.w*0.8)) return;
                    if (b.type === 'stepped' && w.y > b.h*0.8 && (w.x < b.w*0.4 || w.x > b.w*0.6)) return;
                    ctx.fillRect(bx + w.x, -w.y, 2, 4); 
                });
                
                if(b.type === 'empire' || b.h > 200) { ctx.fillStyle = '#ff0000'; let topY = b.type === 'empire' ? -b.h - 30 : -b.h - 5; if(Date.now() % 2000 > 1000) ctx.fillRect(bx + b.w*0.5 - 1.5, topY - 1.5, 3, 3); }
            });
            ctx.restore();

            const segLength = 100; let zOffset = distance % segLength;
            for(let z = 4000; z >= -200; z -= segLength) {
                let z1 = z - zOffset; let z2 = z + segLength - zOffset; if(z1 < -200) continue;
                let wZ1 = z1 + distance; let wZ2 = z2 + distance;
                let c1 = getCurveCenter(wZ1); let c2 = getCurveCenter(wZ2);

                ctx.fillStyle = '#02000a'; ctx.beginPath();
                for(let xOff = -4000; xOff <= 4000; xOff += 400) { let pt = project(c1 + xOff, getWaveY(xOff, wZ1, time), z1); if (xOff === -4000) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y); }
                for(let xOff = 4000; xOff >= -4000; xOff -= 400) { let pt = project(c2 + xOff, getWaveY(xOff, wZ2, time), z2); ctx.lineTo(pt.x, pt.y); }
                ctx.closePath(); ctx.fill();

                let alpha = 1 - (z1 / 4000); ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

                ctx.strokeStyle = '#ff00ff'; ctx.lineWidth = 1; ctx.beginPath();
                for(let xOff = -4000; xOff <= 4000; xOff += 400) { let pt = project(c1 + xOff, getWaveY(xOff, wZ1, time), z1); if (xOff === -4000) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y); }
                ctx.stroke();

                for(let xOff = -4000; xOff <= 4000; xOff += 400) {
                    let v1 = project(c1 + xOff, getWaveY(xOff, wZ1, time), z1); let v2 = project(c2 + xOff, getWaveY(xOff, wZ2, time), z2);
                    ctx.beginPath(); ctx.moveTo(v1.x, v1.y); ctx.lineTo(v2.x, v2.y); ctx.stroke();
                }

                let p1_L = project(c1 - roadWidth/2, getElevation(wZ1), z1); let p1_R = project(c1 + roadWidth/2, getElevation(wZ1), z1);
                let p2_L = project(c2 - roadWidth/2, getElevation(wZ2), z2); let p2_R = project(c2 + roadWidth/2, getElevation(wZ2), z2);

                let thickness1 = 50 * p1_L.scale; let thickness2 = 50 * p2_L.scale; ctx.fillStyle = '#050014';
                ctx.beginPath(); ctx.moveTo(p1_L.x, p1_L.y); ctx.lineTo(p2_L.x, p2_L.y); ctx.lineTo(p2_L.x, p2_L.y + thickness2); ctx.lineTo(p1_L.x, p1_L.y + thickness1); ctx.fill();
                ctx.strokeStyle = '#ff007f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p1_L.x, p1_L.y + thickness1); ctx.lineTo(p2_L.x, p2_L.y + thickness2); ctx.stroke();
                
                ctx.beginPath(); ctx.moveTo(p1_R.x, p1_R.y); ctx.lineTo(p2_R.x, p2_R.y); ctx.lineTo(p2_R.x, p2_R.y + thickness2); ctx.lineTo(p1_R.x, p1_R.y + thickness1); ctx.fill();
                ctx.beginPath(); ctx.moveTo(p1_R.x, p1_R.y + thickness1); ctx.lineTo(p2_R.x, p2_R.y + thickness2); ctx.stroke();

                ctx.fillStyle = '#0a0022'; ctx.beginPath(); ctx.moveTo(p1_L.x, p1_L.y); ctx.lineTo(p1_R.x, p1_R.y); ctx.lineTo(p2_R.x, p2_R.y); ctx.lineTo(p2_L.x, p2_L.y); ctx.fill();

                ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p1_L.x, p1_L.y); ctx.lineTo(p2_L.x, p2_L.y); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(p1_R.x, p1_R.y); ctx.lineTo(p2_R.x, p2_R.y); ctx.stroke();

                ctx.lineWidth = 1;
                for(let i = -1; i <= 1; i++) {
                    let laneOffset = i * (roadWidth / 4);
                    let px1 = project(c1 + laneOffset, getElevation(wZ1), z1); let px2 = project(c2 + laneOffset, getElevation(wZ2), z2);
                    ctx.beginPath(); ctx.moveTo(px1.x, px1.y); ctx.lineTo(px2.x, px2.y); ctx.stroke();
                }
                ctx.beginPath(); ctx.moveTo(p1_L.x, p1_L.y); ctx.lineTo(p1_R.x, p1_R.y); ctx.stroke();
                ctx.globalAlpha = 1;

                groundStars.forEach(s => {
                    if (s.z >= z1 && s.z < z2) {
                        let sX = getCurveCenter(distance + s.z) + s.x;
                        if (Math.abs(s.x) > roadWidth/2 + 200) { 
                            let sY = getWaveY(s.x, distance + s.z, time) - s.yOff; 
                            let sp = project(sX, sY, s.z);
                            let op = Math.max(0, Math.sin(s.pulse)) * alpha;
                            ctx.fillStyle = `rgba(0, 243, 255, ${op})`; ctx.shadowBlur = 10; ctx.shadowColor = '#00f3ff';
                            ctx.beginPath(); ctx.arc(sp.x, sp.y, Math.max(1, 4 * sp.scale), 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
                        }
                    }
                });

                entities.forEach(ent => { if (ent.active && ent.z >= z1 && ent.z < z2) drawEntity(ent, time); });
            }

            if (state !== 'GAMEOVER') {
                ctx.save();
                let carP = project(player.x, player.y, player.z); 
                let bounce = state === 'PLAYING' ? Math.sin(Date.now() * 0.02) * (2 + throttle) : 0; 
                ctx.translate(carP.x, carP.y + bounce - 25 + (player.yOffset * carP.scale));
                ctx.rotate((player.curve * Math.PI) / 180);
                let sc = carP.scale * 1.2; ctx.scale(sc, sc);

                ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(-100, 25, 200, 20); 

                if (state === 'PLAYING') {
                    let flame = Math.random() * 10 + (10 * throttle);
                    ctx.shadowBlur = 15; ctx.shadowColor = '#00f3ff'; ctx.fillStyle = '#00f3ff';
                    ctx.beginPath(); ctx.arc(-50, 20, flame/2, 0, Math.PI*2); ctx.fill();
                    ctx.beginPath(); ctx.arc(50, 20, flame/2, 0, Math.PI*2); ctx.fill();
                }

                ctx.shadowBlur = 0; ctx.fillStyle = '#050505'; ctx.fillRect(-110, 0, 30, 35); ctx.fillRect(80, 0, 30, 35);   
                ctx.fillStyle = '#0a0a0a'; ctx.strokeStyle = '#ff007f'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(-100, 20); ctx.lineTo(100, 20); ctx.lineTo(90, -10); ctx.lineTo(-90, -10); ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-70, -10); ctx.lineTo(70, -10); ctx.lineTo(50, -40); ctx.lineTo(-50, -40); ctx.closePath(); ctx.fill(); ctx.stroke();

                let winGrad = ctx.createLinearGradient(0, -40, 0, -10);
                winGrad.addColorStop(0, '#ffcf00'); winGrad.addColorStop(1, '#ff007f');
                ctx.fillStyle = winGrad; ctx.beginPath(); ctx.moveTo(-65, -12); ctx.lineTo(65, -12); ctx.lineTo(48, -37); ctx.lineTo(-48, -37); ctx.closePath(); ctx.fill();

                ctx.shadowBlur = 20; ctx.shadowColor = '#ff0000'; ctx.fillStyle = '#ff1111';
                ctx.fillRect(-95, 0, 45, 12); ctx.fillRect(50, 0, 45, 12);
                
                if(state === 'PLAYING' && (gameSpeed * throttle) > 15) {
                    ctx.globalAlpha = 0.4; ctx.fillRect(-95, 12, 45, (gameSpeed * throttle)); ctx.fillRect(50, 12, 45, (gameSpeed * throttle)); ctx.globalAlpha = 1;
                }
                ctx.restore();
            }

            particles.forEach(p => {
                ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color;
                ctx.shadowBlur = 15; ctx.shadowColor = p.color;
                ctx.beginPath(); ctx.arc(p.x, p.y, 10 * p.life, 0, Math.PI*2); ctx.fill();
            });
            ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        }

        function loop() { update(); draw(); requestAnimationFrame(loop); }
        window.onload = initGame;
