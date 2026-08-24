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
        Schema::table('data_perawanan', function (Blueprint $table) {
            if (Schema::hasColumn('data_perawanan', 'pegawai_id')) {
                $table->dropForeign(['pegawai_id']);
                $table->dropColumn('pegawai_id');
            }
            if (Schema::hasColumn('data_perawanan', 'teknisi_id')) {
                $table->dropForeign(['teknisi_id']);
                $table->dropColumn('teknisi_id');
            }
            if (Schema::hasColumn('data_perawanan', 'ppnpn_id')) {
                $table->dropForeign(['ppnpn_id']);
                $table->dropColumn('ppnpn_id');
            }
        });

        Schema::table('data_penguapan', function (Blueprint $table) {
            if (Schema::hasColumn('data_penguapan', 'pegawai_id')) {
                $table->dropForeign(['pegawai_id']);
                $table->dropColumn('pegawai_id');
            }
            if (Schema::hasColumn('data_penguapan', 'teknisi_id')) {
                $table->dropForeign(['teknisi_id']);
                $table->dropColumn('teknisi_id');
            }
            if (Schema::hasColumn('data_penguapan', 'ppnpn_id')) {
                $table->dropForeign(['ppnpn_id']);
                $table->dropColumn('ppnpn_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('data_perawanan', function (Blueprint $table) {
            $table->foreignId('pegawai_id')->nullable()->constrained('pegawai')->nullOnDelete();
            $table->foreignId('teknisi_id')->nullable()->constrained('pegawai')->nullOnDelete();
            $table->foreignId('ppnpn_id')->nullable()->constrained('pegawai')->nullOnDelete();
        });

        Schema::table('data_penguapan', function (Blueprint $table) {
            $table->foreignId('pegawai_id')->nullable()->constrained('pegawai')->nullOnDelete();
            $table->foreignId('teknisi_id')->nullable()->constrained('pegawai')->nullOnDelete();
            $table->foreignId('ppnpn_id')->nullable()->constrained('pegawai')->nullOnDelete();
        });
    }
};
