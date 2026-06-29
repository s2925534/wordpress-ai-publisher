<?php

if (!defined('ABSPATH')) {
    exit;
}

class Publisher_Post_Service {
    public function create_draft($payload) {
        $postarr = array(
            'post_title' => isset($payload['title']) ? sanitize_text_field($payload['title']) : '',
            'post_content' => isset($payload['content']) ? wp_kses_post($payload['content']) : '',
            'post_excerpt' => isset($payload['excerpt']) ? sanitize_textarea_field($payload['excerpt']) : '',
            'post_status' => isset($payload['status']) ? sanitize_key($payload['status']) : 'draft',
            'post_name' => isset($payload['slug']) ? sanitize_title($payload['slug']) : '',
            'post_type' => isset($payload['postType']) ? sanitize_key($payload['postType']) : 'post',
        );

        $post_id = wp_insert_post($postarr, true);
        if (is_wp_error($post_id)) {
            return $post_id;
        }

        if (!empty($payload['categories']) && is_array($payload['categories'])) {
            wp_set_post_terms($post_id, array_map('intval', $payload['categories']), 'category');
        }

        if (!empty($payload['tags']) && is_array($payload['tags'])) {
            wp_set_post_terms($post_id, $payload['tags'], 'post_tag');
        }

        if (!empty($payload['featuredMediaId'])) {
            set_post_thumbnail($post_id, intval($payload['featuredMediaId']));
        }

        return array(
            'postId' => intval($post_id),
            'postUrl' => get_permalink($post_id),
            'status' => get_post_status($post_id),
        );
    }

    public function update_post($post_id, $payload) {
        $postarr = array(
            'ID' => intval($post_id),
            'post_title' => isset($payload['title']) ? sanitize_text_field($payload['title']) : null,
            'post_content' => isset($payload['content']) ? wp_kses_post($payload['content']) : null,
            'post_excerpt' => isset($payload['excerpt']) ? sanitize_textarea_field($payload['excerpt']) : null,
            'post_status' => isset($payload['status']) ? sanitize_key($payload['status']) : null,
            'post_name' => isset($payload['slug']) ? sanitize_title($payload['slug']) : null,
        );

        return wp_update_post($postarr, true);
    }

    public function publish_post($post_id) {
        return wp_update_post(array(
            'ID' => intval($post_id),
            'post_status' => 'publish',
        ), true);
    }
}
