<template>
  <div class="flex flex-col gap-2">
    <ReviewCard
      v-for="review in reviews"
      :key="review.id"
      :review="review"
      :view="view"
      @open="emit('open', review)"
      @remove="emit('remove', review)"
    />
  </div>
</template>

<script setup lang="ts">
import type { Review } from '@/schema'
import type { ScopeFilter } from '@/model/matchup'
import ReviewCard from './ReviewCard.vue'

defineProps<{ reviews: Review[]; view: ScopeFilter }>()

const emit = defineEmits<{
  open: [review: Review]
  remove: [review: Review]
}>()
</script>
