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
        Schema::create('data_fklim', function (Blueprint $table) {
            $table->id();
            $table->integer('station_id')->default(138);
            $table->string('station_name')->default('Stasiun Meteorologi Oesman Sadik');
            $table->string('alias_station_id')->nullable();
            $table->dateTime('data_timestamp')->unique();
            $table->string('source_data')->nullable();

            // Temperature fields (C)
            $table->decimal('tbk_0700', 5, 2)->nullable();
            $table->decimal('tbk_1300', 5, 2)->nullable();
            $table->decimal('tbk_1800', 5, 2)->nullable();
            $table->decimal('tbk_avg', 5, 2)->nullable();
            $table->decimal('t_max', 5, 2)->nullable();
            $table->decimal('t_min', 5, 2)->nullable();

            // Rainfall & Sunshine
            $table->decimal('rr_0700', 6, 2)->nullable();
            $table->decimal('ss_8', 5, 2)->nullable();
            $table->string('cu_khusus')->nullable();

            // Pressure & Humidity
            $table->decimal('pp_qfe', 7, 2)->nullable();
            $table->integer('rh_0700')->nullable();
            $table->integer('rh_1300')->nullable();
            $table->integer('rh_1800')->nullable();
            $table->integer('rh_avg')->nullable();

            // Wind
            $table->decimal('ff_avg', 5, 2)->nullable();
            $table->string('wd_cardinal')->nullable();
            $table->decimal('ff_max', 5, 2)->nullable();
            $table->string('wd_ff_max')->nullable();

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
        Schema::dropIfExists('data_fklim');
    }
};
