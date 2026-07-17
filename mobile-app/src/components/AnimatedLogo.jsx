import React, { useEffect } from 'react';
import { Image } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';

const AnimatedLogo = ({ className, style, resizeMode = "contain" }) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 6000,
        easing: Easing.linear,
      }),
      -1, // infinite
      false // do not reverse
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 600 },
        { rotateY: `${rotation.value}deg` }
      ],
    };
  });

  return (
    <Animated.View style={[style, animatedStyle]} className={className}>
      <Image
        source={require('../../assets/images/logo1-clean.webp')}
        style={{ width: '100%', height: '100%' }}
        resizeMode={resizeMode}
      />
    </Animated.View>
  );
};

export default AnimatedLogo;
