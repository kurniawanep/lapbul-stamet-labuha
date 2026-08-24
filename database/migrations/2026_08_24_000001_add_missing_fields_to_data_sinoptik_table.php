<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('data_sinoptik', function (Blueprint $table) {
            // Weather & Indicators
            $table->string('present_weather_ww')->nullable();
            $table->string('past_weather_w1')->nullable();
            $table->string('past_weather_w2')->nullable();
            $table->string('wind_indicator_iw')->nullable();
            $table->string('weather_indicator_ix')->nullable();
            $table->string('rainfall_indicator_ir')->nullable();

            // Pressure details
            $table->float('pressure_reading_mb')->nullable();
            $table->float('pressure_temp_c')->nullable();
            $table->float('pressure_3h_diff_ppp')->nullable();
            $table->float('pressure_24h_diff_p24')->nullable();

            // Cloud Types & Cover (Generals & Low/Med/High)
            $table->string('cloud_low_type_cl')->nullable();
            $table->string('cloud_med_type_cm')->nullable();
            $table->string('cloud_high_type_ch')->nullable();
            $table->float('cloud_low_cover_oktas')->nullable();
            $table->float('cloud_med_cover_oktas')->nullable();
            $table->float('cloud_high_cover_oktas')->nullable();

            // Cloud Layers (1 to 4)
            $table->string('cloud_layer_1_type')->nullable();
            $table->float('cloud_layer_1_height')->nullable();
            $table->float('cloud_layer_1_amt')->nullable();

            $table->string('cloud_layer_2_type')->nullable();
            $table->float('cloud_layer_2_height')->nullable();
            $table->float('cloud_layer_2_amt')->nullable();

            $table->string('cloud_layer_3_type')->nullable();
            $table->float('cloud_layer_3_height')->nullable();
            $table->float('cloud_layer_3_amt')->nullable();

            $table->string('cloud_layer_4_type')->nullable();
            $table->float('cloud_layer_4_height')->nullable();
            $table->float('cloud_layer_4_amt')->nullable();

            // Rainfall periods
            $table->float('rainfall_6h_rrr')->nullable();
            $table->float('rainfall_24h_rrrr')->nullable();

            // Solar, Sunshine, Evaporation & Land
            $table->float('solar_rad_24h')->nullable();
            $table->float('sunshine_hours')->nullable();
            $table->float('evaporation_24h')->nullable();
            $table->string('evaporation_indicator_ie')->nullable();
            $table->string('land_cond')->nullable();
            $table->text('land_note')->nullable();

            // Encoded Synop
            $table->text('encoded_synop')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('data_sinoptik', function (Blueprint $table) {
            $table->dropColumn([
                'present_weather_ww',
                'past_weather_w1',
                'past_weather_w2',
                'wind_indicator_iw',
                'weather_indicator_ix',
                'rainfall_indicator_ir',
                'pressure_reading_mb',
                'pressure_temp_c',
                'pressure_3h_diff_ppp',
                'pressure_24h_diff_p24',
                'cloud_low_type_cl',
                'cloud_med_type_cm',
                'cloud_high_type_ch',
                'cloud_low_cover_oktas',
                'cloud_med_cover_oktas',
                'cloud_high_cover_oktas',
                'cloud_layer_1_type',
                'cloud_layer_1_height',
                'cloud_layer_1_amt',
                'cloud_layer_2_type',
                'cloud_layer_2_height',
                'cloud_layer_2_amt',
                'cloud_layer_3_type',
                'cloud_layer_3_height',
                'cloud_layer_3_amt',
                'cloud_layer_4_type',
                'cloud_layer_4_height',
                'cloud_layer_4_amt',
                'rainfall_6h_rrr',
                'rainfall_24h_rrrr',
                'solar_rad_24h',
                'sunshine_hours',
                'evaporation_24h',
                'evaporation_indicator_ie',
                'land_cond',
                'land_note',
                'encoded_synop',
            ]);
        });
    }
};
