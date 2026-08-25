import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../theme';
import { getDinoHighScore, setDinoHighScore } from '../storage/preferences';

const GAME_WIDTH = 320;
const GAME_HEIGHT = 130;
const GROUND_Y = GAME_HEIGHT - 28;
const DINO_SIZE = 30;
const DINO_X = 24;
const GRAVITY = 2400; // px/s^2
const JUMP_VELOCITY = -820; // px/s
const OBSTACLE_SIZE = 26;
const BASE_SPEED = 210; // px/s
const SPEED_RAMP_PER_SEC = 3.5;

interface Obstacle {
  id: number;
  x: number;
}

/** A small offline-style endless runner (tap to jump over cacti), matching
 * android-source's home/dino package -- embedded in Home to accompany idle
 * moments, exactly like the Android original. Pure View/Animated-driven
 * game loop (no canvas dependency), emoji sprites so it needs zero bundled
 * art assets. */
export function DinoRunnerGame() {
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);

  const dinoY = useRef(new Animated.Value(0)).current;
  const dinoYValue = useRef(0);
  const velocity = useRef(0);
  const elapsed = useRef(0);
  const nextObstacleAt = useRef(1.2);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const nextId = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTime = useRef<number | null>(null);

  useEffect(() => {
    setHighScore(getDinoHighScore());
    const listenerId = dinoY.addListener(({ value }) => {
      dinoYValue.current = value;
    });
    return () => {
      dinoY.removeListener(listenerId);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [dinoY]);

  const endGame = useCallback(() => {
    setRunning(false);
    setGameOver(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const finalScore = Math.floor(elapsed.current * 10);
    setScore(finalScore);
    if (finalScore > getDinoHighScore()) {
      setDinoHighScore(finalScore);
      setHighScore(finalScore);
    }
  }, []);

  const tick = useCallback(
    (time: number) => {
      if (lastTime.current == null) lastTime.current = time;
      const dt = Math.min((time - lastTime.current) / 1000, 0.05);
      lastTime.current = time;
      elapsed.current += dt;

      velocity.current += GRAVITY * dt;
      let y = dinoYValue.current + velocity.current * dt;
      if (y > 0) {
        y = 0;
        velocity.current = 0;
      }
      dinoY.setValue(y);

      const speed = BASE_SPEED + elapsed.current * SPEED_RAMP_PER_SEC * 10;
      obstaclesRef.current = obstaclesRef.current
        .map((o) => ({ ...o, x: o.x - speed * dt }))
        .filter((o) => o.x > -OBSTACLE_SIZE);

      nextObstacleAt.current -= dt;
      if (nextObstacleAt.current <= 0) {
        obstaclesRef.current = [...obstaclesRef.current, { id: nextId.current++, x: GAME_WIDTH }];
        nextObstacleAt.current = 1.1 + Math.random() * 0.9;
      }

      const dinoTop = GROUND_Y - DINO_SIZE + y;
      const dinoBottom = GROUND_Y + y;
      for (const o of obstaclesRef.current) {
        const overlapX = o.x < DINO_X + DINO_SIZE - 6 && o.x + OBSTACLE_SIZE > DINO_X + 6;
        const overlapY = dinoBottom > GROUND_Y - OBSTACLE_SIZE + 8;
        if (overlapX && overlapY) {
          endGame();
          return;
        }
      }

      setObstacles(obstaclesRef.current);
      rafRef.current = requestAnimationFrame(tick);
    },
    [dinoY, endGame],
  );

  function start() {
    setGameOver(false);
    setScore(0);
    elapsed.current = 0;
    velocity.current = 0;
    nextObstacleAt.current = 1.2;
    obstaclesRef.current = [];
    setObstacles([]);
    dinoY.setValue(0);
    lastTime.current = null;
    setRunning(true);
    rafRef.current = requestAnimationFrame(tick);
  }

  function jump() {
    if (!running) {
      start();
      return;
    }
    if (dinoYValue.current === 0) {
      velocity.current = JUMP_VELOCITY;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  return (
    <Pressable style={styles.wrap} onPress={jump}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Puntos: {running ? Math.floor(elapsed.current * 10) : score}</Text>
        <Text style={styles.headerText}>Récord: {highScore}</Text>
      </View>
      <View style={styles.field}>
        <Animated.Text style={[styles.dino, { transform: [{ translateY: dinoY }] }]}>🦖</Animated.Text>
        {obstacles.map((o) => (
          <Text key={o.id} style={[styles.cactus, { left: o.x }]}>
            🌵
          </Text>
        ))}
        <View style={styles.ground} />
        {!running && (
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>{gameOver ? 'Perdiste — tocá para reintentar' : 'Tocá para jugar'}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: theme.spacing.large,
    borderRadius: theme.radii.large,
    backgroundColor: theme.colors.surfaceRaised,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.accent + '22',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.medium,
    paddingTop: theme.spacing.small,
  },
  headerText: {
    color: theme.colors.secondaryOnDark,
    fontSize: 12,
    fontWeight: '600',
  },
  field: {
    height: GAME_HEIGHT,
    width: '100%',
  },
  dino: {
    position: 'absolute',
    left: DINO_X,
    bottom: GAME_HEIGHT - GROUND_Y,
    fontSize: DINO_SIZE,
  },
  cactus: {
    position: 'absolute',
    bottom: GAME_HEIGHT - GROUND_Y,
    fontSize: OBSTACLE_SIZE,
  },
  ground: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: GAME_HEIGHT - GROUND_Y - 1,
    height: 1,
    backgroundColor: theme.colors.secondaryOnDark + '44',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background + 'AA',
  },
  overlayText: {
    color: theme.colors.primaryOnDark,
    fontWeight: '600',
  },
});
