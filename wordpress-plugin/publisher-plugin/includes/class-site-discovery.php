<?php

if (!defined('ABSPATH')) {
    exit;
}

class Publisher_Site_Discovery {
    public function get_site_info() {
        return array(
            'siteName' => get_bloginfo('name'),
            'siteUrl' => home_url(),
            'timezone' => wp_timezone_string(),
            'locale' => determine_locale(),
            'restApiAvailable' => true,
        );
    }

    public function get_discovery_payload() {
        return array(
            'siteInfo' => $this->get_site_info(),
            'canCreatePosts' => current_user_can('edit_posts'),
            'canPublishPosts' => current_user_can('publish_posts'),
            'canUploadMedia' => current_user_can('upload_files'),
            'canCreateCategories' => current_user_can('manage_categories'),
            'canCreateTags' => current_user_can('manage_categories'),
            'availablePostTypes' => $this->get_available_post_types(),
            'availablePostStatuses' => $this->get_available_post_statuses(),
            'categories' => $this->get_terms('category'),
            'tags' => $this->get_terms('post_tag'),
            'authors' => $this->get_authors(),
            'recentPosts' => $this->get_recent_posts(),
            'jetpackStatus' => array(
                'installed' => defined('JETPACK__VERSION'),
                'active' => class_exists('Jetpack'),
                'connected' => class_exists('Jetpack') && method_exists('Jetpack', 'is_active') ? Jetpack::is_active() : false,
                'socialAvailable' => $this->is_jetpack_social_available(),
            ),
            'seoPluginStatus' => array(
                'yoast' => defined('WPSEO_VERSION'),
                'rankmath' => defined('RANK_MATH_VERSION'),
            ),
            'mediaSettings' => $this->get_media_settings(),
        );
    }

    public function get_categories() {
        return $this->get_terms('category');
    }

    public function get_tags() {
        return $this->get_terms('post_tag');
    }

    public function get_authors() {
        $users = get_users(array(
            'who' => 'authors',
            'fields' => array('ID', 'display_name', 'user_nicename'),
        ));

        $authors = array();
        foreach ($users as $user) {
            $authors[] = array(
                'id' => intval($user->ID),
                'name' => $user->display_name,
                'slug' => $user->user_nicename,
            );
        }

        return $authors;
    }

    public function get_recent_posts() {
        $posts = get_posts(array(
            'post_type' => 'post',
            'post_status' => array('publish', 'draft', 'future', 'pending'),
            'posts_per_page' => 10,
        ));

        $items = array();
        foreach ($posts as $post) {
            $slug = trim($post->post_name);

            if (empty($slug)) {
                $slug = sanitize_title(get_the_title($post));
            }

            if (empty($slug)) {
                $slug = 'post-' . intval($post->ID);
            }

            $items[] = array(
                'id' => intval($post->ID),
                'title' => get_the_title($post),
                'slug' => $slug,
                'url' => get_permalink($post),
                'status' => $post->post_status,
            );
        }

        return $items;
    }

    private function get_terms($taxonomy) {
        $terms = get_terms(array(
            'taxonomy' => $taxonomy,
            'hide_empty' => false,
        ));

        if (is_wp_error($terms)) {
            return array();
        }

        $items = array();
        foreach ($terms as $term) {
            $items[] = array(
                'id' => intval($term->term_id),
                'name' => $term->name,
                'slug' => $term->slug,
                'description' => $term->description,
                'count' => intval($term->count),
            );
        }

        return $items;
    }

    private function get_available_post_types() {
        $types = get_post_types(array('show_ui' => true), 'objects');
        $items = array();

        foreach ($types as $type) {
            $supports = get_all_post_type_supports($type->name);
            if (!is_array($supports)) {
                $supports = array();
            }

            $items[] = array(
                'name' => $type->name,
                'label' => $type->label,
                'public' => $type->public,
                'supports' => array_keys(array_filter($supports)),
            );
        }

        return $items;
    }

    private function get_available_post_statuses() {
        $statuses = get_post_stati(array(), 'objects');
        $items = array();

        foreach ($statuses as $key => $status) {
            $items[] = array(
                'name' => $key,
                'label' => isset($status->label) ? $status->label : $key,
                'public' => isset($status->public) ? $status->public : false,
            );
        }

        return $items;
    }

    private function get_media_settings() {
        return array(
            'maxUploadSize' => function_exists('wp_max_upload_size') ? wp_max_upload_size() : null,
            'mimeTypes' => function_exists('get_allowed_mime_types') ? array_keys(get_allowed_mime_types()) : array(),
        );
    }

    private function is_jetpack_social_available() {
        return class_exists('Jetpack') && function_exists('jetpack_social_sharing_enabled');
    }
}
