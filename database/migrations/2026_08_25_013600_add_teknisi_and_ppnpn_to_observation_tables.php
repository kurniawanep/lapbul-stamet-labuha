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
        $tables = [
            'data_pibal',
            'data_tafor',
            'data_metar',
            'data_sinoptik',
            'data_fklim',
            'data_perawanan',
            'data_penguapan',
            'data_met_report',
            'data_flight_document',
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                Schema::table($table, function (Blueprint $t) use ($table) {
                    if (!Schema::hasColumn($table, 'teknisi_id')) {
                        $t->foreignId('teknisi_id')->nullable()->constrained('pegawai')->nullOnDelete();
                    }
                    if (!Schema::hasColumn($table, 'ppnpn_id')) {
                        $t->foreignId('ppnpn_id')->nullable()->constrained('pegawai')->nullOnDelete();
                    }
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tables = [
            'data_pibal',
            'data_tafor',
            'data_metar',
            'data_sinoptik',
            'data_fklim',
            'data_perawanan',
            'data_penguapan',
            'data_met_report',
            'data_flight_document',
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                Schema::table($table, function (Blueprint $t) use ($table) {
                    if (Schema::hasColumn($table, 'teknisi_id')) {
                        $t->dropForeign([$table . '_teknisi_id_foreign']);
                        $t->dropColumn('teknisi_id');
                    }
                    if (Schema::hasColumn($table, 'ppnpn_id')) {
                        $t->dropForeign([$table . '_ppnpn_id_foreign']);
                        $t->dropColumn('ppnpn_id');
                    }
                });
            }
        }
    }
};
