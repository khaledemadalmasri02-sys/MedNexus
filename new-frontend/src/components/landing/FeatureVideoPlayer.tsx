import { useEffect, useRef } from 'react';

interface FeatureVideoPlayerProps {
  featureId: number;
  color: string;
  isActive: boolean;
  bgColor?: string;
}

// 1. PDF Upload & Extraction - Document with text extraction particles
function drawPDFExtraction(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, color: string, bgColor: string) {
  ctx.clearRect(0, 0, w, h);
  
  // Background
  const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
  bg.addColorStop(0, color + '12');
  bg.addColorStop(1, bgColor);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // PDF Document
  const docW = w * 0.35;
  const docH = h * 0.55;
  const docX = w * 0.15;
  const docY = h * 0.22;
  
  // Document shadow
  ctx.shadowColor = color + '40';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 5;
  
  // Document body
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.roundRect(docX, docY, docW, docH, 8);
  ctx.fill();
  
  // Document border
  ctx.strokeStyle = color + '40';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // PDF icon
  ctx.font = `${Math.min(w, h) * 0.08}px sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText('📄', docX + docW / 2, docY + docH * 0.25);

  // Text lines in document
  const lineCount = 6;
  for (let i = 0; i < lineCount; i++) {
    const lineY = docY + docH * 0.35 + i * (docH * 0.08);
    const lineWidth = docW * (0.6 + Math.sin(i * 1.5) * 0.2);
    ctx.fillStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.beginPath();
    ctx.roundRect(docX + docW * 0.15, lineY, lineWidth, 4, 2);
    ctx.fill();
  }

  // Extraction particles flowing from document to cards
  const particleCount = 15;
  for (let i = 0; i < particleCount; i++) {
    const progress = ((t * 0.001 + i * 0.07) % 1);
    const startX = docX + docW;
    const startY = docY + docH * 0.3 + (i % 5) * (docH * 0.1);
    const endX = w * 0.7;
    const endY = h * 0.2 + (i % 4) * (h * 0.2);
    
    const px = startX + (endX - startX) * progress;
    const py = startY + (endY - startY) * progress + Math.sin(progress * Math.PI * 2) * 10;
    
    const alpha = Math.sin(progress * Math.PI);
    const size = 3 + alpha * 2;
    
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fillStyle = color + Math.round(alpha * 255).toString(16).padStart(2, '0');
    ctx.fill();
    
    // Particle trail
    ctx.beginPath();
    ctx.arc(px, py, size + 4, 0, Math.PI * 2);
    ctx.fillStyle = color + Math.round(alpha * 50).toString(16).padStart(2, '0');
    ctx.fill();
  }

  // Generated flashcards
  const cardCount = 3;
  for (let i = 0; i < cardCount; i++) {
    const cardX = w * 0.6;
    const cardY = h * 0.15 + i * (h * 0.25);
    const cardW = w * 0.28;
    const cardH = h * 0.18;
    const appearProgress = Math.min(Math.max((t * 0.001 - 0.3 - i * 0.15), 0), 1);
    
    if (appearProgress > 0) {
      ctx.globalAlpha = appearProgress;
      
      // Card shadow
      ctx.shadowColor = color + '30';
      ctx.shadowBlur = 15;
      
      // Card body
      ctx.fillStyle = '#0f0f1a';
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 8);
      ctx.fill();
      
      // Card border
      ctx.strokeStyle = color + '60';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      
      // Card content
      ctx.fillStyle = color;
      ctx.font = `bold ${Math.min(w, h) * 0.025}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(`Card ${i + 1}`, cardX + 10, cardY + 20);
      
      ctx.fillStyle = '#94A3B8';
      ctx.font = `${Math.min(w, h) * 0.02}px sans-serif`;
      const text = 'Extracted concept...';
      const charCount = Math.floor(appearProgress * text.length);
      ctx.fillText(text.substring(0, charCount), cardX + 10, cardY + 40);
      
      ctx.globalAlpha = 1;
    }
  }

  // Upload arrow animation
  const arrowY = docY - 30 + Math.sin(t * 0.003) * 5;
  ctx.font = `${Math.min(w, h) * 0.04}px sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText('⬆️', docX + docW / 2, arrowY);
}

// 2. AI Card Generation - Neural network with card creation animation
function drawAIGeneration(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, color: string, bgColor: string) {
  ctx.clearRect(0, 0, w, h);
  
  // Background
  const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
  bg.addColorStop(0, color + '12');
  bg.addColorStop(1, bgColor);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Neural network layers
  const layers = [
    { count: 3, x: w * 0.1 },   // Input
    { count: 5, x: w * 0.3 },   // Hidden 1
    { count: 5, x: w * 0.5 },   // Hidden 2
    { count: 3, x: w * 0.7 },   // Output
  ];

  // Draw connections
  for (let l = 0; l < layers.length - 1; l++) {
    const layer1 = layers[l];
    const layer2 = layers[l + 1];
    
    for (let i = 0; i < layer1.count; i++) {
      for (let j = 0; j < layer2.count; j++) {
        const y1 = h * 0.2 + (i / (layer1.count - 1)) * h * 0.6;
        const y2 = h * 0.2 + (j / (layer2.count - 1)) * h * 0.6;
        
        ctx.beginPath();
        ctx.moveTo(layer1.x, y1);
        ctx.lineTo(layer2.x, y2);
        ctx.strokeStyle = color + '20';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Animated signal
        const signalProgress = ((t * 0.001 + i * 0.1 + j * 0.05 + l * 0.2) % 1);
        const sx = layer1.x + (layer2.x - layer1.x) * signalProgress;
        const sy = y1 + (y2 - y1) * signalProgress;
        
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
    }
  }

  // Draw nodes
  layers.forEach((layer, l) => {
    for (let i = 0; i < layer.count; i++) {
      const y = h * 0.2 + (i / (layer.count - 1)) * h * 0.6;
      const pulse = Math.sin(t * 0.003 + i * 0.5 + l) * 0.2 + 0.8;
      const radius = 8 + pulse * 3;
      
      // Glow
      ctx.beginPath();
      ctx.arc(layer.x, y, radius + 6, 0, Math.PI * 2);
      ctx.fillStyle = color + '20';
      ctx.fill();
      
      // Node
      ctx.beginPath();
      ctx.arc(layer.x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  });

  // AI Brain icon
  ctx.font = `${Math.min(w, h) * 0.06}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('🧠', w * 0.5, h * 0.12);

  // Generated cards appearing
  const cardCount = 2;
  for (let i = 0; i < cardCount; i++) {
    const cardX = w * 0.78;
    const cardY = h * 0.3 + i * (h * 0.35);
    const cardW = w * 0.18;
    const cardH = h * 0.2;
    const appearProgress = Math.min(Math.max((t * 0.0008 - 0.4 - i * 0.2), 0), 1);
    
    if (appearProgress > 0) {
      ctx.globalAlpha = appearProgress;
      
      ctx.fillStyle = '#0f0f1a';
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 6);
      ctx.fill();
      
      ctx.strokeStyle = color + '60';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      ctx.fillStyle = color;
      ctx.font = `bold ${Math.min(w, h) * 0.02}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('✨ AI Card', cardX + 8, cardY + 18);
      
      ctx.fillStyle = '#94A3B8';
      ctx.font = `${Math.min(w, h) * 0.015}px sans-serif`;
      ctx.fillText('Generated...', cardX + 8, cardY + 35);
      
      ctx.globalAlpha = 1;
    }
  }

  // Text input indicator
  ctx.fillStyle = color;
  ctx.font = `${Math.min(w, h) * 0.025}px sans-serif`;
  ctx.textAlign = 'center';
  const inputText = 'Enter text or upload...';
  const charCount = Math.floor((t * 0.002) % (inputText.length + 5));
  ctx.fillText(inputText.substring(0, Math.min(charCount, inputText.length)) + '|', w * 0.1, h * 0.9);
}

// 3. QBank - Professional MCQ with animated selection, timer, and streak
function drawQBank(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, color: string, bgColor: string) {
  ctx.clearRect(0, 0, w, h);
  const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
  bg.addColorStop(0, color + '15');
  bg.addColorStop(1, bgColor);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const fs = Math.min(w, h);
  const pad = w * 0.08;
  const cardW = w - pad * 2;
  const cardX = pad;

  // --- Top bar: question counter + timer + streak ---
  const barY = h * 0.04;
  ctx.fillStyle = '#0a0a14';
  ctx.beginPath();
  ctx.roundRect(cardX, barY, cardW, h * 0.06, 6);
  ctx.fill();

  // Question counter
  ctx.fillStyle = color;
  ctx.font = 'bold ' + fs * 0.022 + 'px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Q 12 / 50', cardX + 12, barY + h * 0.04);

  // Timer (counting down)
  const timerSec = 30 - Math.floor((t * 0.0003) % 30);
  ctx.fillStyle = timerSec < 10 ? '#F43F5E' : '#94A3B8';
  ctx.font = 'bold ' + fs * 0.022 + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(timerSec) + 's', w / 2, barY + h * 0.04);

  // Streak
  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold ' + fs * 0.02 + 'px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Streak: 5', cardX + cardW - 12, barY + h * 0.04);

  // --- Question card ---
  const qY = barY + h * 0.08;
  const qH = h * 0.28;
  ctx.fillStyle = '#0d0d1a';
  ctx.beginPath();
  ctx.roundRect(cardX, qY, cardW, qH, 10);
  ctx.fill();
  ctx.strokeStyle = color + '25';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Question text (medical style)
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold ' + fs * 0.024 + 'px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('A 55-year-old male presents with chest pain', cardX + 16, qY + h * 0.07);
  ctx.fillStyle = '#94a3b8';
  ctx.font = fs * 0.02 + 'px sans-serif';
  ctx.fillText('radiating to the left arm. ECG shows ST elevation', cardX + 16, qY + h * 0.12);
  ctx.fillText('in leads II, III, and aVF. What is the most likely', cardX + 16, qY + h * 0.17);
  ctx.fillStyle = color;
  ctx.font = 'bold ' + fs * 0.022 + 'px sans-serif';
  ctx.fillText('diagnosis?', cardX + 16, qY + h * 0.23);

  // --- Answer options ---
  const options = [
    { label: 'A', text: 'Anterior wall MI', correct: false },
    { label: 'B', text: 'Inferior wall MI', correct: true },
    { label: 'C', text: 'Lateral wall MI', correct: false },
    { label: 'D', text: 'Pericarditis', correct: false },
  ];

  // Animate: user selects B after 1.5s, then show correct after 3s
  const cycle = (t % 6000);
  const selectedIdx = cycle < 1500 ? -1 : cycle < 3000 ? 1 : 1; // select B
  const showResult = cycle >= 3000;
  const revealProgress = showResult ? Math.min((cycle - 3000) / 800, 1) : 0;

  const optStartY = qY + qH + h * 0.03;
  const optH = h * 0.09;
  const optGap = h * 0.015;

  options.forEach(function(opt, i) {
    const oy = optStartY + i * (optH + optGap);
    const isSelected = i === selectedIdx && selectedIdx >= 0;
    const isCorrect = opt.correct;
    const showCorrect = showResult && isCorrect;
    const showWrong = showResult && isSelected && !isCorrect;

    // Background
    const bgAlpha = isSelected ? '25' : showCorrect ? '20' : '08';
    ctx.fillStyle = (showCorrect ? '#10B981' : showWrong ? '#F43F5E' : isSelected ? color : '#0a0a14') + bgAlpha;
    ctx.beginPath();
    ctx.roundRect(cardX, oy, cardW, optH, 8);
    ctx.fill();

    // Border
    ctx.strokeStyle = showCorrect ? '#10B981' : showWrong ? '#F43F5E' : isSelected ? color : '#1e293b';
    ctx.lineWidth = showCorrect || showWrong ? 2 : isSelected ? 1.5 : 1;
    ctx.stroke();

    // Glow for correct answer
    if (showCorrect && revealProgress > 0) {
      ctx.shadowColor = '#10B981';
      ctx.shadowBlur = 15 * revealProgress;
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cardX, oy, cardW, optH, 8);
      ctx.stroke();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    // Letter badge
    const badgeX = cardX + 20;
    const badgeY = oy + optH / 2;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, 12, 0, Math.PI * 2);
    ctx.fillStyle = showCorrect ? '#10B981' : showWrong ? '#F43F5E' : isSelected ? color : '#1e293b';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + fs * 0.018 + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(opt.label, badgeX, badgeY + 5);

    // Option text
    ctx.fillStyle = showCorrect ? '#fff' : showWrong ? '#fecaca' : isSelected ? '#e2e8f0' : '#64748b';
    ctx.font = (isSelected || showCorrect ? 'bold ' : '') + fs * 0.019 + 'px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(opt.text, badgeX + 24, badgeY + 5);

    // Checkmark / X
    if (showCorrect) {
      ctx.fillStyle = '#10B981';
      ctx.font = 'bold ' + fs * 0.022 + 'px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('\u2713', cardX + cardW - 16, badgeY + 6);
    }
    if (showWrong) {
      ctx.fillStyle = '#F43F5E';
      ctx.font = 'bold ' + fs * 0.022 + 'px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('\u2717', cardX + cardW - 16, badgeY + 6);
    }
  });

  // --- Bottom: progress bar + score ---
  const botY = optStartY + 4 * (optH + optGap) + h * 0.02;

  // Progress track
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(cardX, botY, cardW, 6, 3);
  ctx.fill();

  // Progress fill (animated)
  const progress = 0.24 + Math.sin(t * 0.0002) * 0.02;
  const grad = ctx.createLinearGradient(cardX, 0, cardX + cardW, 0);
  grad.addColorStop(0, color);
  grad.addColorStop(0.7, '#8B5CF6');
  grad.addColorStop(1, '#06B6D4');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(cardX, botY, cardW * progress, 6, 3);
  ctx.fill();

  // Score + accuracy
  ctx.fillStyle = '#10B981';
  ctx.font = 'bold ' + fs * 0.02 + 'px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('85% accuracy', cardX, botY + 22);

  ctx.fillStyle = '#64748b';
  ctx.font = fs * 0.018 + 'px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('340 / 400 correct', cardX + cardW, botY + 22);

  // Floating particles
  for (let i = 0; i < 6; i++) {
    const px = (w * 0.15 + i * w * 0.14 + Math.sin(t * 0.001 + i * 2) * 15) % w;
    const py = h * 0.9 + Math.cos(t * 0.0008 + i * 1.5) * 8;
    const alpha = 0.15 + Math.sin(t * 0.002 + i) * 0.1;
    ctx.beginPath();
    ctx.arc(px, py, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = (i % 2 === 0 ? color : '#8B5CF6') + Math.round(alpha * 255).toString(16).padStart(2, '0');
    ctx.fill();
  }
}

// 4. Study Mode - Flip card animation with progress ring
function drawStudyMode(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, color: string, bgColor: string) {
  ctx.clearRect(0, 0, w, h);
  
  // Background
  const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
  bg.addColorStop(0, color + '12');
  bg.addColorStop(1, bgColor);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Progress ring
  const ringX = w * 0.5;
  const ringY = h * 0.15;
  const ringRadius = w * 0.08;
  const progress = ((t * 0.0001) % 1);
  
  // Ring background
  ctx.beginPath();
  ctx.arc(ringX, ringY, ringRadius, 0, Math.PI * 2);
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 8;
  ctx.stroke();
  
  // Ring progress
  ctx.beginPath();
  ctx.arc(ringX, ringY, ringRadius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.stroke();
  
  // Progress text
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.min(w, h) * 0.035}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(Math.round(progress * 100) + '%', ringX, ringY + 8);
  
  ctx.fillStyle = '#94A3B8';
  ctx.font = `${Math.min(w, h) * 0.018}px sans-serif`;
  ctx.fillText('Daily Goal', ringX, ringY + ringRadius + 25);

  // Flip card
  const cardW = w * 0.5;
  const cardH = h * 0.45;
  const cardX = w / 2 - cardW / 2;
  const cardY = h * 0.3;
  
  // Flip animation
  const flipProgress = (t * 0.0005) % 1;
  const isFlipping = flipProgress > 0.8;
  const scaleX = isFlipping ? Math.cos((flipProgress - 0.8) * 5 * Math.PI) : 1;
  
  ctx.save();
  ctx.translate(w / 2, cardY + cardH / 2);
  ctx.scale(scaleX, 1);
  ctx.translate(-w / 2, -(cardY + cardH / 2));
  
  // Card shadow
  ctx.shadowColor = color + '30';
  ctx.shadowBlur = 20;
  
  // Card body
  ctx.fillStyle = '#0f0f1a';
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 16);
  ctx.fill();
  
  // Card border
  ctx.strokeStyle = color + '40';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  
  // Card content
  const showBack = flipProgress > 0.4 && flipProgress < 0.9;
  
  if (!showBack) {
    // Front - Question
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.min(w, h) * 0.025}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('QUESTION', w / 2, cardY + 40);
    
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.min(w, h) * 0.03}px sans-serif`;
    ctx.fillText('What is the', w / 2, cardY + cardH / 2 - 20);
    ctx.fillText('mitochondria?', w / 2, cardY + cardH / 2 + 20);
  } else {
    // Back - Answer
    ctx.fillStyle = '#10B981';
    ctx.font = `bold ${Math.min(w, h) * 0.025}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ANSWER', w / 2, cardY + 40);
    
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.min(w, h) * 0.025}px sans-serif`;
    ctx.fillText('The powerhouse', w / 2, cardY + cardH / 2 - 20);
    ctx.fillText('of the cell', w / 2, cardY + cardH / 2 + 20);
  }
  
  ctx.restore();

  // Difficulty buttons
  const buttons = ['Again', 'Hard', 'Good', 'Easy'];
  const buttonColors = ['#F43F5E', '#F59E0B', '#10B981', '#3B82F6'];
  const buttonW = w * 0.18;
  const buttonH = h * 0.06;
  const buttonY = cardY + cardH + 30;
  const buttonGap = (w - buttonW * 4) / 5;
  
  buttons.forEach((btn, i) => {
    const btnX = buttonGap + i * (buttonW + buttonGap);
    
    ctx.fillStyle = buttonColors[i] + '20';
    ctx.beginPath();
    ctx.roundRect(btnX, buttonY, buttonW, buttonH, 8);
    ctx.fill();
    
    ctx.strokeStyle = buttonColors[i] + '60';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.fillStyle = buttonColors[i];
    ctx.font = `bold ${Math.min(w, h) * 0.018}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(btn, btnX + buttonW / 2, buttonY + buttonH / 2 + 5);
  });

  // Card counter
  ctx.fillStyle = '#94A3B8';
  ctx.font = `${Math.min(w, h) * 0.02}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('12 / 50 cards reviewed', w / 2, buttonY + buttonH + 30);
}

// 5. AI Explanations - Lightbulb with expanding knowledge nodes
function drawAIExplanations(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, color: string, bgColor: string) {
  ctx.clearRect(0, 0, w, h);
  
  // Background
  const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
  bg.addColorStop(0, color + '15');
  bg.addColorStop(1, bgColor);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Central lightbulb
  const bulbX = w * 0.25;
  const bulbY = h * 0.35;
  const pulse = Math.sin(t * 0.003) * 0.15 + 0.85;
  
  // Glow effect
  const glowGrad = ctx.createRadialGradient(bulbX, bulbY, 0, bulbX, bulbY, 60 * pulse);
  glowGrad.addColorStop(0, color + '40');
  glowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(bulbX, bulbY, 60 * pulse, 0, Math.PI * 2);
  ctx.fill();
  
  // Lightbulb icon
  ctx.font = `${Math.min(w, h) * 0.1}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('💡', bulbX, bulbY + 15);

  // Knowledge nodes expanding from lightbulb
  const nodes = [
    { label: 'Explanation', angle: -0.5, distance: 0.25, color: '#3B82F6' },
    { label: 'Mnemonic', angle: 0, distance: 0.28, color: '#8B5CF6' },
    { label: 'Clinical Pearl', angle: 0.5, distance: 0.25, color: '#10B981' },
    { label: 'Related', angle: 1, distance: 0.3, color: '#F59E0B' },
    { label: 'Deep Dive', angle: 1.5, distance: 0.28, color: '#F43F5E' },
  ];
  
  const expandProgress = Math.min((t * 0.0005) % 2, 1);
  
  nodes.forEach((node, i) => {
    const nodeDelay = i * 0.1;
    const nodeProgress = Math.max(0, Math.min((expandProgress - nodeDelay) * 2, 1));
    
    if (nodeProgress > 0) {
      const nx = bulbX + Math.cos(node.angle) * w * node.distance * nodeProgress;
      const ny = bulbY + Math.sin(node.angle) * h * node.distance * nodeProgress;
      
      // Connection line
      ctx.beginPath();
      ctx.moveTo(bulbX, bulbY);
      ctx.lineTo(nx, ny);
      ctx.strokeStyle = node.color + '40';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Animated dot on line
      const dotProgress = ((t * 0.002 + i * 0.2) % 1);
      const dotX = bulbX + (nx - bulbX) * dotProgress;
      const dotY = bulbY + (ny - bulbY) * dotProgress;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.fill();
      
      // Node
      ctx.globalAlpha = nodeProgress;
      
      // Node glow
      ctx.beginPath();
      ctx.arc(nx, ny, 25, 0, Math.PI * 2);
      ctx.fillStyle = node.color + '20';
      ctx.fill();
      
      // Node circle
      ctx.beginPath();
      ctx.arc(nx, ny, 18, 0, Math.PI * 2);
      ctx.fillStyle = '#0f0f1a';
      ctx.fill();
      ctx.strokeStyle = node.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Node label
      ctx.fillStyle = node.color;
      ctx.font = `bold ${Math.min(w, h) * 0.018}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(node.label, nx, ny + 45);
      
      ctx.globalAlpha = 1;
    }
  });

  // Explanation panel
  const panelX = w * 0.55;
  const panelY = h * 0.15;
  const panelW = w * 0.38;
  const panelH = h * 0.7;
  
  ctx.fillStyle = '#0f0f1a';
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 12);
  ctx.fill();
  
  ctx.strokeStyle = color + '30';
  ctx.lineWidth = 1;
  ctx.stroke();
  
  // Panel header
  ctx.fillStyle = color;
  ctx.font = `bold ${Math.min(w, h) * 0.025}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText('🤖 AI Explanation', panelX + 15, panelY + 30);
  
  // Explanation text (typing effect)
  const explanationText = 'This concept relates to cellular respiration, where mitochondria convert glucose into ATP through a series of enzymatic reactions...';
  const charCount = Math.floor((t * 0.001) % (explanationText.length + 10));
  
  ctx.fillStyle = '#94A3B8';
  ctx.font = `${Math.min(w, h) * 0.018}px sans-serif`;
  
  const words = explanationText.split(' ');
  let line = '';
  let lineY = panelY + 60;
  
  for (let i = 0; i < words.length && i < charCount; i++) {
    const testLine = line + words[i] + ' ';
    if (ctx.measureText(testLine).width > panelW - 40) {
      ctx.fillText(line, panelX + 15, lineY);
      line = words[i] + ' ';
      lineY += 22;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line + (charCount < explanationText.length ? '|' : ''), panelX + 15, lineY);
}

// 6. Planner - Calendar grid with scheduled items appearing
function drawPlanner(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, color: string, bgColor: string) {
  ctx.clearRect(0, 0, w, h);
  
  // Background
  const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
  bg.addColorStop(0, color + '12');
  bg.addColorStop(1, bgColor);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Calendar container
  const calX = w * 0.08;
  const calY = h * 0.1;
  const calW = w * 0.55;
  const calH = h * 0.8;
  
  ctx.fillStyle = '#0f0f1a';
  ctx.beginPath();
  ctx.roundRect(calX, calY, calW, calH, 12);
  ctx.fill();
  
  ctx.strokeStyle = color + '30';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Month header
  ctx.fillStyle = color;
  ctx.font = `bold ${Math.min(w, h) * 0.03}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('January 2025', calX + calW / 2, calY + 35);

  // Day headers
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const cellW = calW / 7;
  const cellH = (calH - 80) / 6;
  
  ctx.fillStyle = '#94A3B8';
  ctx.font = `${Math.min(w, h) * 0.018}px sans-serif`;
  days.forEach((day, i) => {
    ctx.fillText(day, calX + cellW * i + cellW / 2, calY + 60);
  });

  // Calendar grid
  const today = 15;
  const studyDays = [3, 5, 8, 10, 12, 15, 17, 20, 22, 25, 28];
  const appearProgress = Math.min((t * 0.0003) % 2, 1);
  
  for (let week = 0; week < 6; week++) {
    for (let day = 0; day < 7; day++) {
      const dayNum = week * 7 + day + 1;
      if (dayNum > 31) break;
      
      const cellX = calX + day * cellW;
      const cellY = calY + 75 + week * cellH;
      
      // Day number
      const isToday = dayNum === today;
      const hasStudy = studyDays.includes(dayNum);
      const dayAppear = Math.min(Math.max((appearProgress - dayNum * 0.03) * 3, 0), 1);
      
      if (dayAppear > 0) {
        ctx.globalAlpha = dayAppear;
        
        // Today highlight
        if (isToday) {
          ctx.fillStyle = color + '30';
          ctx.beginPath();
          ctx.roundRect(cellX + 5, cellY + 2, cellW - 10, cellH - 4, 6);
          ctx.fill();
        }
        
        // Study indicator
        if (hasStudy && dayAppear > 0.5) {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(cellX + cellW / 2, cellY + cellH - 12, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Day number
        ctx.fillStyle = isToday ? color : '#fff';
        ctx.font = `${Math.min(w, h) * 0.022}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(String(dayNum), cellX + cellW / 2, cellY + 25);
        
        ctx.globalAlpha = 1;
      }
    }
  }

  // Side panel - Today's schedule
  const panelX = calX + calW + 20;
  const panelY = calY;
  const panelW = w * 0.3;
  const panelH = calH;
  
  ctx.fillStyle = '#0f0f1a';
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 12);
  ctx.fill();
  
  ctx.strokeStyle = color + '30';
  ctx.lineWidth = 1;
  ctx.stroke();
  
  // Panel header
  ctx.fillStyle = color;
  ctx.font = `bold ${Math.min(w, h) * 0.025}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText("Today's Schedule", panelX + 15, panelY + 30);
  
  // Schedule items
  const items = [
    { time: '9:00 AM', title: 'Biology Review', duration: '45 min', color: '#3B82F6' },
    { time: '10:30 AM', title: 'QBank Practice', duration: '60 min', color: '#8B5CF6' },
    { time: '2:00 PM', title: 'New Cards', duration: '30 min', color: '#10B981' },
    { time: '4:00 PM', title: 'Review Session', duration: '45 min', color: '#F59E0B' },
  ];
  
  items.forEach((item, i) => {
    const itemY = panelY + 60 + i * 70;
    const itemAppear = Math.min(Math.max((appearProgress - 0.3 - i * 0.15) * 3, 0), 1);
    
    if (itemAppear > 0) {
      ctx.globalAlpha = itemAppear;
      
      // Item background
      ctx.fillStyle = item.color + '15';
      ctx.beginPath();
      ctx.roundRect(panelX + 10, itemY, panelW - 20, 55, 8);
      ctx.fill();
      
      // Time
      ctx.fillStyle = item.color;
      ctx.font = `bold ${Math.min(w, h) * 0.018}px sans-serif`;
      ctx.fillText(item.time, panelX + 20, itemY + 22);
      
      // Title
      ctx.fillStyle = '#fff';
      ctx.font = `${Math.min(w, h) * 0.02}px sans-serif`;
      ctx.fillText(item.title, panelX + 20, itemY + 42);
      
      // Duration
      ctx.fillStyle = '#94A3B8';
      ctx.font = `${Math.min(w, h) * 0.015}px sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText(item.duration, panelX + panelW - 20, itemY + 22);
      ctx.textAlign = 'left';
      
      ctx.globalAlpha = 1;
    }
  });
}

// 7. Library - Organized grid of decks with search
function drawLibrary(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, color: string, bgColor: string) {
  ctx.clearRect(0, 0, w, h);
  
  // Background
  const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
  bg.addColorStop(0, color + '12');
  bg.addColorStop(1, bgColor);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Search bar
  const searchX = w * 0.08;
  const searchY = h * 0.08;
  const searchW = w * 0.84;
  const searchH = h * 0.08;
  
  ctx.fillStyle = '#0f0f1a';
  ctx.beginPath();
  ctx.roundRect(searchX, searchY, searchW, searchH, 10);
  ctx.fill();
  
  ctx.strokeStyle = color + '40';
  ctx.lineWidth = 1;
  ctx.stroke();
  
  // Search icon and text
  ctx.fillStyle = '#94A3B8';
  ctx.font = `${Math.min(w, h) * 0.025}px sans-serif`;
  ctx.textAlign = 'left';
  const searchText = 'Search decks, qbanks, topics...';
  const charCount = Math.floor((t * 0.001) % (searchText.length + 5));
  ctx.fillText('🔍 ' + searchText.substring(0, Math.min(charCount, searchText.length)) + (charCount < searchText.length ? '|' : ''), searchX + 20, searchY + searchH / 2 + 6);

  // Filter tabs
  const tabs = ['All', 'Decks', 'QBanks', 'Topics'];
  const tabX = searchX;
  const tabY = searchY + searchH + 15;
  
  tabs.forEach((tab, i) => {
    const isActive = i === 0;
    const tx = tabX + i * 80;
    
    ctx.fillStyle = isActive ? color + '20' : 'transparent';
    ctx.beginPath();
    ctx.roundRect(tx, tabY, 70, 30, 6);
    ctx.fill();
    
    if (isActive) {
      ctx.strokeStyle = color + '60';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    
    ctx.fillStyle = isActive ? color : '#94A3B8';
    ctx.font = `${Math.min(w, h) * 0.018}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(tab, tx + 35, tabY + 20);
  });

  // Deck grid
  const decks = [
    { title: 'Anatomy', cards: 245, color: '#3B82F6', icon: '🦴' },
    { title: 'Pharmacology', cards: 189, color: '#8B5CF6', icon: '💊' },
    { title: 'Pathology', cards: 312, color: '#10B981', icon: '🔬' },
    { title: 'Biochemistry', cards: 156, color: '#F59E0B', icon: '⚗️' },
    { title: 'QBank Step 1', cards: 500, color: '#F43F5E', icon: '📝' },
    { title: 'Microbiology', cards: 203, color: '#06B6D4', icon: '🦠' },
  ];
  
  const gridX = searchX;
  const gridY = tabY + 50;
  const cols = 3;
  const cardW = (searchW - 20) / cols;
  const cardH = h * 0.22;
  const appearProgress = Math.min((t * 0.0004) % 2, 1);
  
  decks.forEach((deck, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const dx = gridX + col * (cardW + 10);
    const dy = gridY + row * (cardH + 10);
    const deckAppear = Math.min(Math.max((appearProgress - i * 0.1) * 3, 0), 1);
    
    if (deckAppear > 0) {
      ctx.globalAlpha = deckAppear;
      
      // Card shadow
      ctx.shadowColor = deck.color + '20';
      ctx.shadowBlur = 10;
      
      // Card body
      ctx.fillStyle = '#0f0f1a';
      ctx.beginPath();
      ctx.roundRect(dx, dy, cardW, cardH, 10);
      ctx.fill();
      
      // Card border
      ctx.strokeStyle = deck.color + '40';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      
      // Deck icon
      ctx.font = `${Math.min(w, h) * 0.04}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(deck.icon, dx + cardW / 2, dy + 35);
      
      // Deck title
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.min(w, h) * 0.022}px sans-serif`;
      ctx.fillText(deck.title, dx + cardW / 2, dy + 65);
      
      // Card count
      ctx.fillStyle = '#94A3B8';
      ctx.font = `${Math.min(w, h) * 0.018}px sans-serif`;
      ctx.fillText(`${deck.cards} cards`, dx + cardW / 2, dy + 85);
      
      // Progress bar
      const progressW = cardW * 0.7;
      const progressX = dx + (cardW - progressW) / 2;
      const progressY = dy + cardH - 25;
      
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.roundRect(progressX, progressY, progressW, 6, 3);
      ctx.fill();
      
      const progress = 0.3 + Math.sin(i * 1.5) * 0.3;
      ctx.fillStyle = deck.color;
      ctx.beginPath();
      ctx.roundRect(progressX, progressY, progressW * progress, 6, 3);
      ctx.fill();
      
      ctx.globalAlpha = 1;
    }
  });

  // Sort indicator
  ctx.fillStyle = '#94A3B8';
  ctx.font = `${Math.min(w, h) * 0.015}px sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText('Sorted by: Recently Updated', w * 0.92, h * 0.95);
}

// 8. Sync - Devices connecting with sync waves
function drawSync(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, color: string, bgColor: string) {
  ctx.clearRect(0, 0, w, h);
  
  // Background
  const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
  bg.addColorStop(0, color + '12');
  bg.addColorStop(1, bgColor);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Devices
  const devices = [
    { x: w * 0.15, y: h * 0.5, type: '💻', label: 'Laptop' },
    { x: w * 0.5, y: h * 0.3, type: '☁️', label: 'Cloud' },
    { x: w * 0.85, y: h * 0.5, type: '📱', label: 'Phone' },
    { x: w * 0.5, y: h * 0.75, type: '📱', label: 'Tablet' },
  ];

  // Draw sync connections
  const centerDevice = devices[1]; // Cloud is center
  
  devices.forEach((device, i) => {
    if (i === 1) return; // Skip cloud
    
    // Connection line
    ctx.beginPath();
    ctx.moveTo(device.x, device.y);
    ctx.lineTo(centerDevice.x, centerDevice.y);
    ctx.strokeStyle = color + '30';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Sync waves
    const waveCount = 3;
    for (let w2 = 0; w2 < waveCount; w2++) {
      const waveProgress = ((t * 0.001 + w2 * 0.33) % 1);
      const wx = device.x + (centerDevice.x - device.x) * waveProgress;
      const wy = device.y + (centerDevice.y - device.y) * waveProgress;
      const alpha = Math.sin(waveProgress * Math.PI);
      
      ctx.beginPath();
      ctx.arc(wx, wy, 4, 0, Math.PI * 2);
      ctx.fillStyle = color + Math.round(alpha * 255).toString(16).padStart(2, '0');
      ctx.fill();
    }
  });

  // Draw devices
  devices.forEach((device, i) => {
    const isCloud = i === 1;
    const pulse = Math.sin(t * 0.003 + i) * 0.1 + 0.9;
    
    // Device glow
    if (isCloud) {
      ctx.beginPath();
      ctx.arc(device.x, device.y, 50 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = color + '20';
      ctx.fill();
    }
    
    // Device icon
    ctx.font = `${Math.min(w, h) * 0.06}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(device.type, device.x, device.y + 10);
    
    // Device label
    ctx.fillStyle = '#94A3B8';
    ctx.font = `${Math.min(w, h) * 0.018}px sans-serif`;
    ctx.fillText(device.label, device.x, device.y + 45);
  });

  // Sync status
  const statusY = h * 0.92;
  
  // Status indicator
  const syncProgress = ((t * 0.0005) % 1);
  const isSyncing = syncProgress < 0.8;
  
  ctx.beginPath();
  ctx.arc(w * 0.4, statusY, 6, 0, Math.PI * 2);
  ctx.fillStyle = isSyncing ? color : '#10B981';
  ctx.fill();
  
  ctx.fillStyle = '#fff';
  ctx.font = `${Math.min(w, h) * 0.02}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(isSyncing ? 'Syncing...' : 'All synced ✓', w * 0.42, statusY + 5);

  // Last sync time
  ctx.fillStyle = '#94A3B8';
  ctx.font = `${Math.min(w, h) * 0.015}px sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText('Last sync: 2 min ago', w * 0.92, statusY + 5);

  // Offline indicator
  ctx.fillStyle = '#0f0f1a';
  ctx.beginPath();
  ctx.roundRect(w * 0.08, h * 0.05, 100, 30, 6);
  ctx.fill();
  
  ctx.strokeStyle = '#10B981' + '60';
  ctx.lineWidth = 1;
  ctx.stroke();
  
  ctx.fillStyle = '#10B981';
  ctx.font = `${Math.min(w, h) * 0.015}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('● Offline Ready', w * 0.08 + 50, h * 0.05 + 20);
}

const animators: Record<number, (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, color: string, bgColor: string) => void> = {
  1: drawPDFExtraction,
  2: drawAIGeneration,
  3: drawQBank,
  4: drawStudyMode,
  5: drawAIExplanations,
  6: drawPlanner,
  7: drawLibrary,
  8: drawSync,
};

function isDarkMode(): boolean {
  if (typeof document === 'undefined') return true;
  return document.documentElement.classList.contains('dark') ||
         (!document.documentElement.classList.contains('light') &&
          window.matchMedia('(prefers-color-scheme: dark)').matches);
}

export default function FeatureVideoPlayer({ featureId, color, isActive, bgColor: _bgColor = '#050505' }: FeatureVideoPlayerProps) {
  void _bgColor;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const featureIdRef = useRef(featureId);
  const colorRef = useRef(color);
  const isActiveRef = useRef(isActive);

  useEffect(() => {
    featureIdRef.current = featureId;
    colorRef.current = color;
    isActiveRef.current = isActive;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ultra-high-res canvas for crisp rendering (supersampling)
    // Render at 3x the display size for retina-quality output
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(window.devicePixelRatio || 2, 2);
    const displayW = Math.max(rect.width, 400);
    const displayH = Math.max(rect.height, 240);
    const scale = 2.5; // supersampling multiplier
    const canvasW = Math.round(displayW * dpr * scale);
    const canvasH = Math.round(displayH * dpr * scale);
    
    if (canvas.width !== canvasW || canvas.height !== canvasH) {
      canvas.width = canvasW;
      canvas.height = canvasH;
    }

    const render = () => {
      if (!isActiveRef.current) return;
      ctx.clearRect(0, 0, canvasW, canvasH);
      // Scale all drawing to the high-res canvas
      const sx = canvasW / displayW;
      const sy = canvasH / displayH;
      ctx.setTransform(sx, 0, 0, sy, 0, 0);
      const now = performance.now();
      const animator = animators[featureIdRef.current];
      if (animator) {
        const bgCol = isDarkMode() ? 'rgb(5,5,5)' : 'rgb(248,250,252)';
        animator(ctx, displayW, displayH, now, colorRef.current, bgCol);
      }
      animFrameRef.current = requestAnimationFrame(render);
    };

    if (isActive) {
      animFrameRef.current = requestAnimationFrame(render);
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isActive]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ display: 'block' }}
    />
  );
}
