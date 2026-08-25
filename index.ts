import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';

import App from './App';
import { PlaybackService } from './src/playback/service';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// Must be registered at the top level, before the app renders, so remote
// (lockscreen/Control Center) commands work even while the JS UI is asleep.
TrackPlayer.registerPlaybackService(() => PlaybackService);
