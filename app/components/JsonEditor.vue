<script setup lang="ts">
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { basicSetup } from 'codemirror'
import { json, jsonParseLinter } from '@codemirror/lang-json'
import { linter, lintGutter } from '@codemirror/lint'

const props = defineProps<{
  modelValue: string
  readonly?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editorRef = ref<HTMLDivElement>()
const editorView = ref<EditorView>()
const colorMode = useColorMode()

onMounted(() => {
  if (!editorRef.value) return

  const extensions = [
    basicSetup,
    json(),
    linter(jsonParseLinter()),
    lintGutter(),
    EditorView.lineWrapping,
    EditorView.updateListener.of((update) => {
      if (update.docChanged && !props.readonly) {
        emit('update:modelValue', update.state.doc.toString())
      }
    }),
  ]

  editorView.value = new EditorView({
    doc: props.modelValue,
    extensions,
    parent: editorRef.value,
  })

  // 如果是只读模式
  if (props.readonly) {
    editorView.value.contentDOM.setAttribute('contenteditable', 'false')
  }
})

// 监听 modelValue 变化，更新编辑器内容
watch(() => props.modelValue, (newValue) => {
  if (editorView.value && newValue !== editorView.value.state.doc.toString()) {
    editorView.value.dispatch({
      changes: {
        from: 0,
        to: editorView.value.state.doc.length,
        insert: newValue,
      },
    })
  }
})


onBeforeUnmount(() => {
  editorView.value?.destroy()
})
</script>

<template>
  <div
    ref="editorRef"
    class="rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden"
    :class="{ 'opacity-60': readonly }"
  />
</template>

<style>
.cm-editor {
  height: 400px;
  font-size: 14px;
}

.cm-scroller {
  overflow: auto;
}
</style>
