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
        Schema::create('data_wxrev', function (Blueprint $table) {
            $table->id();
            $table->integer('station_id')->default(138);
            $table->string('station_name')->default('Stasiun Meteorologi Oesman Sadik');
            $table->dateTime('data_timestamp');

            // Telegram sandi fields
            $table->text('sandi')->nullable();
            $table->string('mmyygp')->nullable();
            $table->string('iiiii')->default('97460')->nullable();
            $table->string('attxtxtntn')->nullable();
            $table->string('appxpxpnpn')->nullable();
            $table->string('auuxuxunun')->nullable();
            $table->string('arrrrr')->nullable();
            $table->string('rdrddfmfm1')->nullable();
            $table->string('rdrddfmfm2')->nullable();
            $table->string('jam_kirim')->default('00,00Z VST')->nullable();

            // Decoded meteorological parameters
            $table->integer('pressure_indicator')->nullable();
            $table->decimal('pressure_max', 6, 2)->nullable();
            $table->decimal('pressure_min', 6, 2)->nullable();

            $table->integer('temperature_indicator')->nullable();
            $table->decimal('temperature_max', 5, 2)->nullable();
            $table->decimal('temperature_min', 5, 2)->nullable();

            $table->integer('relative_humidity_indicator')->nullable();
            $table->decimal('relative_humidity_max', 5, 2)->nullable();
            $table->decimal('relative_humidity_min', 5, 2)->nullable();

            $table->integer('rainfall_indicator')->nullable();
            $table->decimal('rainfall_24', 6, 2)->nullable();
            $table->integer('number_of_observation')->nullable();

            $table->decimal('dominant_wind_direction_1', 5, 2)->nullable();
            $table->decimal('dominant_wind_direction_2', 5, 2)->nullable();
            $table->decimal('dominant_wind_speed_1', 5, 2)->nullable();
            $table->decimal('dominant_wind_speed_2', 5, 2)->nullable();
            $table->integer('number_of_dominant_wind_direction_1')->nullable();
            $table->integer('number_of_dominant_wind_direction_2')->nullable();

            // Observer & Staff references
            $table->string('observer_name')->nullable();
            $table->foreignId('pegawai_id')->nullable()->constrained('pegawai')->nullOnDelete();
            $table->foreignId('teknisi_id')->nullable()->constrained('pegawai')->nullOnDelete();
            $table->foreignId('ppnpn_id')->nullable()->constrained('pegawai')->nullOnDelete();

            $table->timestamps();

            $table->unique(['station_id', 'data_timestamp']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('data_wxrev');
    }
};
