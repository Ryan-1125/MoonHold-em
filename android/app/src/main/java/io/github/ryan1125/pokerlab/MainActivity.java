package io.github.ryan1125.pokerlab;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import androidx.core.view.WindowCompat;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ImageExportPlugin.class);
        super.onCreate(savedInstanceState);
        // SystemBars pads this view around cutouts and system bars. Paint the exposed padding too.
        getWindow().getDecorView().setBackgroundColor(getColor(R.color.pokerlab_background));
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView()).setAppearanceLightStatusBars(false);
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView()).setAppearanceLightNavigationBars(false);
    }
}
