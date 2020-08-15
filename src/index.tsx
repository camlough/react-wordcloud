// @ts-nocheck
import { descending } from 'd3-array';
// import cloud from 'd3-cloud';
import cloud from './d3-cloud';
import React, { useEffect, useRef, useMemo } from 'react';
import seedrandom from 'seedrandom';

import { useResponsiveSVGSelection } from './hooks';
import render from './render';
import * as types from './types';
import { getDefaultColors, getFontScale, getText, rotate } from './utils';

const MAX_LAYOUT_ATTEMPTS = 1;
const SHRINK_FACTOR = 0.95;
const WORD_SHRINK_FACTOR = 0.75;

export * from './types';

export const defaultCallbacks: types.Callbacks = {
  getWordTooltip: ({ text, value }) => `${text} (${value})`,
};

export const defaultOptions: types.Options = {
  colors: getDefaultColors(),
  deterministic: false,
  enableTooltip: true,
  fontFamily: 'times new roman',
  fontSizes: [4, 32],
  fontStyle: 'normal',
  fontWeight: 'normal',
  padding: 1,
  rotationAngles: [-90, 90],
  scale: types.Scale.Sqrt,
  spiral: types.Spiral.Rectangular,
  transitionDuration: 600,
};

export interface Props {
  /**
   * Callbacks to control various word properties and behaviors.
   */
  callbacks?: types.CallbacksProp;
  /**
   * Maximum number of words to display.
   */
  maxWords?: number;
  /**
   * Set minimum [width, height] values for the SVG container.
   */
  minSize?: types.MinMaxPair;
  /**
   * Configure wordcloud with various options.
   */
  options?: types.OptionsProp;
  /**
   * Set explicit [width, height] values for the SVG container.  This will disable responsive resizing.
   */
  size?: types.MinMaxPair;
  /**
   * An array of word.  A word is an object that must contain the 'text' and 'value' keys.
   */
  words: types.Word[];
}

export default function Wordcloud({
  callbacks,
  maxWords = 100,
  minSize,
  options,
  size: initialSize,
  words,
}: Props): JSX.Element {
  // without useMemo the component re-renders on every upstream change
  // because of the creation of new mergedCallbacks and mergedOptions variables
  const mergedCallbacks = useMemo(() => {return { ...defaultCallbacks, ...callbacks }}, []);
  const mergedOptions = useMemo(() => {return { ...defaultOptions, ...options }}, []);

  const [ref, selection, size] = useResponsiveSVGSelection(
    minSize,
    initialSize,
  );

  useEffect(() => {
    if (selection) {
      const {
        deterministic,
        fontFamily,
        fontStyle,
        fontSizes,
        fontWeight,
        padding,
        rotations,
        rotationAngles,
        spiral,
        stepLimit,
        timeInterval,
        scale,
      } = mergedOptions;

      const sortedWords = words
        .concat()
        .sort((x, y) => descending(x.value, y.value))
        .slice(0, maxWords);

      const random = deterministic ? seedrandom('deterministic') : seedrandom();

      const layout = cloud()
        .size(size)
        .padding(padding)
        .rotate(() => {
          if (rotations === undefined) {
            // default rotation algorithm
            return (~~(random() * 6) - 3) * 30;
          } else {
            return rotate(rotations, rotationAngles, random);
          }
        })
        .spiral(spiral)
        .stepLimit(stepLimit)
        .timeInterval(timeInterval)
        .random(random)
        .text(getText)
        .font(fontFamily)
        .fontStyle(fontStyle)
        .fontWeight(fontWeight)
        .stepLimit(stepLimit)
        .timeInterval(timeInterval);

      const draw = (fontSizes: types.MinMaxPair, words: types.Word[], attempts = 1): void => {
        layout
          .words(words)
          .fontSize((word: types.Word) => {
            // just returning the value because we apply our own font scaling ahead of time
            return word.value;
          })
          .on('end', (computedWords: types.Word[]) => {
            render(
              selection,
              computedWords,
              mergedOptions,
              mergedCallbacks,
              random,
            );
          })
          .start();
      };
      draw(fontSizes, sortedWords);
    }
  }, [maxWords, mergedCallbacks, mergedOptions, selection, size, words]);

  return <div ref={ref} />;
}

Wordcloud.defaultProps = {
  callbacks: defaultCallbacks,
  maxWords: 100,
  minSize: [300, 300],
  options: defaultOptions,
};
