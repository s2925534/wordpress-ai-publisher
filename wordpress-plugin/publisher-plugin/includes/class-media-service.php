<?php

if (!defined('ABSPATH')) {
    exit;
}

class Publisher_Media_Service {
    public function upload_media($payload) {
        if (empty($payload['url'])) {
            return new WP_Error('publisher_invalid_media', 'Media URL is required.', array('status' => 400));
        }

        require_once ABSPATH . 'wp-admin/includes/image.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/file.php';

        $attachment_id = media_sideload_image($payload['url'], 0, isset($payload['altText']) ? sanitize_text_field($payload['altText']) : '', 'id');
        if (is_wp_error($attachment_id)) {
            return $attachment_id;
        }

        if (!empty($payload['altText'])) {
            update_post_meta($attachment_id, '_wp_attachment_image_alt', sanitize_text_field($payload['altText']));
        }

        if (!empty($payload['caption'])) {
            wp_update_post(array(
                'ID' => intval($attachment_id),
                'post_excerpt' => sanitize_textarea_field($payload['caption']),
            ));
        }

        return array(
            'mediaId' => intval($attachment_id),
            'mediaUrl' => wp_get_attachment_url($attachment_id),
        );
    }

    public function set_alt_text($media_id, $alt_text) {
        return update_post_meta(intval($media_id), '_wp_attachment_image_alt', sanitize_text_field($alt_text));
    }
}
