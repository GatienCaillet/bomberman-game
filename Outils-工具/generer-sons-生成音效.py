#!/usr/bin/env python3
"""Synthétise des effets de jeu originaux en WAV mono 44,1 kHz. / 合成单声道街机音效。"""
from array import array
from math import exp, pi, sin
from pathlib import Path
import random
import sys
import wave

RATE = 44100
DESTINATION = Path(__file__).resolve().parents[1] / 'Ressources-素材' / 'Sons-音效'
DESTINATION.mkdir(parents=True, exist_ok=True)


def write_sound(filename, duration, synth, peak=0.75):
    samples = [synth(i / RATE) for i in range(round(duration * RATE))]
    largest = max(abs(sample) for sample in samples) or 1
    scale = peak / largest
    pcm = array('h', (round(sample * scale * 32767) for sample in samples))
    if sys.byteorder != 'little':
        pcm.byteswap()
    with wave.open(str(DESTINATION / filename), 'wb') as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes(pcm.tobytes())


def noise_source(seed, smoothing):
    generator = random.Random(seed)
    state = 0.0

    def sample():
        nonlocal state
        state += (generator.uniform(-1, 1) - state) * smoothing
        return state
    return sample


foot_noise = noise_source(172, 0.15)
def footstep(t):
    # Un pas discret sur les pavés, déclenché à chaque appui. / 石板脚步声。
    attack = min(1.0, t / 0.003)
    thud = sin(2 * pi * (112 * t - 105 * t * t)) * exp(-t * 31)
    grit = foot_noise() * exp(-t * 42)
    return attack * (0.72 * thud + 0.50 * grit) * max(0, 1 - t / 0.15)


blast_noise = noise_source(231, 0.21)
def explosion(t):
    # Explosion brève : attaque sèche, graves descendants et souffle final. / 短爆音，低频衰减。
    attack = min(1.0, t / 0.002)
    low = sin(2 * pi * (118 * t - 72 * t * t)) * exp(-t * 8)
    body = blast_noise() * exp(-t * 5.5)
    pop = sin(2 * pi * 640 * t) * exp(-t * 48)
    return attack * (0.68 * low + 1.05 * body + 0.22 * pop) * max(0, 1 - t / 0.72)


placement_noise = noise_source(410, 0.28)
def placement(t):
    # Pose brève : impact doux puis petit clic de jeu. / 轻撞接短点击。
    attack = min(1.0, t / 0.002)
    thud = sin(2 * pi * (178 * t - 155 * t * t)) * exp(-t * 24)
    click = sin(2 * pi * 930 * t) * exp(-t * 60)
    grit = placement_noise() * exp(-t * 34)
    return attack * (0.7 * thud + 0.18 * click + 0.3 * grit) * max(0, 1 - t / 0.22)


write_sound('pas-脚步.wav', 0.15, footstep, 0.58)
write_sound('explosion-爆炸.wav', 0.72, explosion, 0.88)
write_sound('placement-放置.wav', 0.22, placement, 0.67)
