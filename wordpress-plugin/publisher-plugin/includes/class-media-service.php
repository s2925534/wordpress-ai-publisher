<?php

if (!defined('ABSPATH')) {
    exit;
}

class Publisher_Media_Service {
    public function upload_media($payload) {
        return new WP_Error('publisher_not_implemented', 'Media upload is scaffolded in Phase 2.', array('status' => 501));
    }
}
