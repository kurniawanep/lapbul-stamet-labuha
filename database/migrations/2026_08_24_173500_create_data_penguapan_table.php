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
        Schema::create('data_penguapan', function (Blueprint $table) {
            $table->id();
            $table->integer('station_id')->default(138);
            $table->string('station_name')->default('Stasiun Meteorologi Oesman Sadik');
            $table->string('alias_station_id')->nullable();
            $table->dateTime('data_timestamp')->unique();
            $table->string('source_data')->nullable();

            // Penguapan & Anemometer 0.5m fields
            $table->decimal('op_diff_baca', 6, 2)->nullable();
            $table->decimal('t_air_max', 5, 2)->nullable();
            $table->decimal('t_air_min', 5, 2)->nullable();
            $table->decimal('t_air_avg', 5, 2)->nullable();
            $table->decimal('rr_0700', 6, 2)->nullable();
            $table->decimal('op_eva', 6, 2)->nullable();
            $table->decimal('ws_avg_0c5', 5, 2)->nullable();

            // Observer & Quality Control
            $table->string('observer_name')->nullable();
            $table->foreignId('pegawai_id')->nullable()->constrained('pegawai')->nullOnDelete();
            $table->integer('qc_flag')->default(0);
            $table->text('qc_histories')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('data_penguapan');
    }
};
