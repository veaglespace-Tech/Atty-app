import React, { useEffect } from 'react';
import { Image, View } from 'react-native';
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
    <View className={className}>
      <Animated.View style={[style, animatedStyle, { alignItems: 'center', justifyContent: 'center' }]}>
        <Image
          source={require('../../assets/images/veagle-space-logo.png')}
          style={{ width: '100%', height: '100%' }}
          resizeMode={resizeMode}
        />
      </Animated.View>
    </View>
  );
};

export default AnimatedLogo;
