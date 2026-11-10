<template>
  <PageShell v-if="!championStore.get(scope.myChamp)" title="Unknown champion" back @back="back">
    <p class="text-sm text-(--color-on-surface-muted)">This champion is not in the current data.</p>
  </PageShell>

  <PageShell v-else :title="pageTitle" back @back="back">
    <template #actions>
      <BaseButton @click="startReview">
        <BaseIcon name="plus" :size="16" />
        New review
      </BaseButton>
    </template>

    <MatchupScopeHeader :scope="scope" @update:scope="navigate" />

    <p
      v-if="reviews.length === 0"
      class="rounded-lg border border-dashed border-(--color-outline) p-8 text-center text-sm text-(--color-on-surface-muted)"
    >
      No reviews here yet. Write one after your next game.
    </p>
    <ReviewList
      v-else
      :reviews="reviews"
      :view="scope"
      @open="openReview"
      @remove="confirmRemove"
    />

    <BaseDialog v-model:open="isConfirmingRemove" title="Delete this review?">
      <p>The tips you wrote during it stay.</p>
      <template #actions>
        <BaseButton variant="text" @click="isConfirmingRemove = false">Cancel</BaseButton>
        <BaseButton variant="danger" @click="removeConfirmed">Delete</BaseButton>
      </template>
    </BaseDialog>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { MatchupScope, Review } from '@/schema'
import { BaseButton, BaseDialog, BaseIcon } from '@/components/base'
import { PageShell } from '@/components/composite'
import MatchupScopeHeader from '@/components/matchups/MatchupScopeHeader.vue'
import ReviewList from '@/components/reviews/ReviewList.vue'
import { useToast } from '@/composables/useToast'
import { describeScope } from '@/model/labels'
import { reviewsForView } from '@/model/reviews'
import { matchupRoute } from '@/router/matchupRoute'
import { scopeFromRoute } from '@/router/scopeFromRoute'
import { useChampionStore } from '@/stores/champions'
import { useNotebookStore } from '@/stores/notebook'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const championStore = useChampionStore()
const notebookStore = useNotebookStore()

const scope = computed<MatchupScope>(() => scopeFromRoute(route))
const pageTitle = computed(() => `Reviews: ${describeScope(scope.value, championStore.nameOf)}`)
const reviews = computed(() => reviewsForView(notebookStore.reviews, scope.value))

const reviewToRemove = ref<Review>()
const isConfirmingRemove = ref(false)

function back(): void {
  void router.push(matchupRoute('Matchup', scope.value))
}

function navigate(next: MatchupScope): void {
  void router.push(matchupRoute('Reviews', next))
}

function startReview(): void {
  void router.push(matchupRoute('NewReview', scope.value))
}

function openReview(review: Review): void {
  void router.push({ name: 'Review', params: { id: review.id } })
}

function confirmRemove(review: Review): void {
  reviewToRemove.value = review
  isConfirmingRemove.value = true
}

async function removeConfirmed(): Promise<void> {
  const review = reviewToRemove.value
  isConfirmingRemove.value = false
  if (!review) return
  try {
    await notebookStore.removeReview(review.id)
  } catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'Could not delete the review.')
  }
}
</script>
