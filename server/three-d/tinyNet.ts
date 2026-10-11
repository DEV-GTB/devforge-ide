/**
 * TinyMLP — a dependency-free multilayer perceptron with real gradient-descent
 * training. It runs entirely in-process (no GPU, no database, no native deps),
 * so it is perfect for small in-project models: classifiers, regressors and
 * pattern learners trained on the user's own examples.
 */

export interface TrainExample {
  input: number[];
  output: number[];
}

export interface TrainSummary {
  epochs: number;
  loss: number;
  accuracy: number;
  samples: number;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const sigmoidPrime = (a: number) => a * (1 - a);
const tanh = (x: number) => Math.tanh(x);
const tanhPrime = (a: number) => 1 - a * a;

export class TinyMLP {
  readonly sizes: number[];
  private weights: number[][][] = [];
  private biases: number[][] = [];
  private rng: () => number;
  readonly seed: number;

  constructor(sizes: number[], seed = 42) {
    if (sizes.length < 2) throw new Error("A network needs at least an input and an output layer.");
    this.sizes = sizes;
    this.seed = seed;
    this.rng = mulberry32(seed);
    this.initWeights();
  }

  private initWeights() {
    this.weights = [];
    this.biases = [];
    for (let l = 0; l < this.sizes.length - 1; l++) {
      const fanIn = this.sizes[l];
      const fanOut = this.sizes[l + 1];
      const scale = Math.sqrt(2 / (fanIn + fanOut));
      const layerW: number[][] = [];
      for (let i = 0; i < fanIn; i++) {
        const row: number[] = [];
        for (let j = 0; j < fanOut; j++) {
          row.push((this.rng() * 2 - 1) * scale);
        }
        layerW.push(row);
      }
      this.weights.push(layerW);
      this.biases.push(new Array(fanOut).fill(0));
    }
  }

  /** Returns activations for every layer, index 0 being the raw input. */
  private forward(input: number[]): number[][] {
    const activations: number[][] = [input.slice()];
    let current = input;
    for (let l = 0; l < this.weights.length; l++) {
      const isOutput = l === this.weights.length - 1;
      const layerW = this.weights[l];
      const layerB = this.biases[l];
      const next: number[] = new Array(layerW[0].length);
      for (let j = 0; j < layerW[0].length; j++) {
        let sum = layerB[j];
        for (let i = 0; i < current.length; i++) {
          sum += current[i] * layerW[i][j];
        }
        next[j] = isOutput ? sigmoid(sum) : tanh(sum);
      }
      activations.push(next);
      current = next;
    }
    return activations;
  }

  predict(input: number[]): number[] {
    const activations = this.forward(input);
    return activations[activations.length - 1];
  }

  train(examples: TrainExample[], epochs: number, lr: number): TrainSummary {
    if (!examples.length) throw new Error("At least one training example is required.");
    const inputSize = this.sizes[0];
    const outputSize = this.sizes[this.sizes.length - 1];
    for (const example of examples) {
      if (example.input.length !== inputSize) {
        throw new Error(`Expected inputs of length ${inputSize}, received ${example.input.length}.`);
      }
      if (example.output.length !== outputSize) {
        throw new Error(`Expected outputs of length ${outputSize}, received ${example.output.length}.`);
      }
    }

    let lastLoss = 0;
    for (let epoch = 0; epoch < epochs; epoch++) {
      let epochLoss = 0;
      // Shuffle for better convergence.
      const order = examples.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }

      for (const index of order) {
        const { input, output } = examples[index];
        const activations = this.forward(input);

        // Output layer delta (MSE with sigmoid output).
        const outputActivation = activations[activations.length - 1];
        let delta: number[] = outputActivation.map(
          (a, k) => (a - output[k]) * sigmoidPrime(a)
        );
        epochLoss += outputActivation.reduce(
          (sum, a, k) => sum + (a - output[k]) ** 2,
          0
        ) / outputSize;

        // Backpropagate through layers.
        for (let l = this.weights.length - 1; l >= 0; l--) {
          const prevActivation = activations[l];
          const layerW = this.weights[l];
          const nextDelta: number[] = new Array(prevActivation.length).fill(0);

          for (let i = 0; i < prevActivation.length; i++) {
            for (let j = 0; j < layerW[i].length; j++) {
              nextDelta[i] += layerW[i][j] * delta[j];
            }
          }

          // Gradient step for this layer.
          for (let i = 0; i < prevActivation.length; i++) {
            for (let j = 0; j < layerW[i].length; j++) {
              layerW[i][j] -= lr * delta[j] * prevActivation[i];
            }
          }
          for (let j = 0; j < this.biases[l].length; j++) {
            this.biases[l][j] -= lr * delta[j];
          }

          if (l > 0) {
            const hiddenActivation = activations[l];
            delta = nextDelta.map((d, i) => d * tanhPrime(hiddenActivation[i]));
          }
        }
      }
      lastLoss = epochLoss / examples.length;
    }

    return {
      epochs,
      loss: Number(lastLoss.toFixed(6)),
      accuracy: this.accuracy(examples),
      samples: examples.length,
    };
  }

  /** Classification accuracy using nearest output (treats outputs as one-hot). */
  accuracy(examples: TrainExample[]): number {
    if (!examples.length) return 0;
    let correct = 0;
    for (const example of examples) {
      const prediction = this.predict(example.input);
      const predictedLabel = prediction.indexOf(Math.max(...prediction));
      const expectedLabel = example.output.indexOf(Math.max(...example.output));
      if (predictedLabel === expectedLabel) correct++;
    }
    return Number((correct / examples.length).toFixed(4));
  }

  toJSON() {
    return {
      sizes: this.sizes,
      seed: this.seed,
      weights: this.weights,
      biases: this.biases,
    };
  }
}
