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
        Schema::table('data_pibal', function (Blueprint $table) {
            if (!Schema::hasColumn('data_pibal', 'delta_min')) {
                $table->float('delta_min')->nullable()->after('sent_timestamp');
            }
            if (!Schema::hasColumn('data_pibal', 'monitoring_status')) {
                $table->string('monitoring_status')->nullable()->after('delta_min');
            }
            if (!Schema::hasColumn('data_pibal', 'delay_minutes')) {
                $table->integer('delay_minutes')->default(0)->after('monitoring_status');
            }
        });

        Schema::table('data_sinoptik', function (Blueprint $table) {
            if (!Schema::hasColumn('data_sinoptik', 'delta_min')) {
                $table->float('delta_min')->nullable()->after('sent_timestamp');
            }
            if (!Schema::hasColumn('data_sinoptik', 'monitoring_status')) {
                $table->string('monitoring_status')->nullable()->after('delta_min');
            }
            if (!Schema::hasColumn('data_sinoptik', 'delay_minutes')) {
                $table->integer('delay_minutes')->default(0)->after('monitoring_status');
            }
        });

        Schema::table('data_metar', function (Blueprint $table) {
            if (!Schema::hasColumn('data_metar', 'delta_min')) {
                $table->float('delta_min')->nullable()->after('sent_timestamp');
            }
            if (!Schema::hasColumn('data_metar', 'monitoring_status')) {
                $table->string('monitoring_status')->nullable()->after('delta_min');
            }
            if (!Schema::hasColumn('data_metar', 'delay_minutes')) {
                $table->integer('delay_minutes')->default(0)->after('monitoring_status');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('data_pibal', function (Blueprint $table) {
            $table->dropColumn(['delta_min', 'monitoring_status', 'delay_minutes']);
        });

        Schema::table('data_sinoptik', function (Blueprint $table) {
            $table->dropColumn(['delta_min', 'monitoring_status', 'delay_minutes']);
        });

        Schema::table('data_metar', function (Blueprint $table) {
            $table->dropColumn(['delta_min', 'monitoring_status', 'delay_minutes']);
        });
    }
};
