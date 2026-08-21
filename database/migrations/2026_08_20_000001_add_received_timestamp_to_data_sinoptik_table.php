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
            if (!Schema::hasColumn('data_sinoptik', 'received_timestamp')) {
                $table->dateTime('received_timestamp')->nullable()->after('data_timestamp');
            }
            if (!Schema::hasColumn('data_sinoptik', 'sent_timestamp')) {
                $table->dateTime('sent_timestamp')->nullable()->after('received_timestamp');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('data_sinoptik', function (Blueprint $table) {
            if (Schema::hasColumn('data_sinoptik', 'received_timestamp')) {
                $table->dropColumn('received_timestamp');
            }
            if (Schema::hasColumn('data_sinoptik', 'sent_timestamp')) {
                $table->dropColumn('sent_timestamp');
            }
        });
    }
};
