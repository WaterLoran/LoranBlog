<template>
    <div>
      <canvas ref="pdfCanvas"></canvas>
    </div>
  </template>
  
  <script>
  import pdfjsLib from 'pdfjs-dist/build/pdf';
  import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry';
  
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  
  export default {
    props: {
      src: {
        type: String,
        required: true
      }
    },
    mounted() {
      const loadingTask = pdfjsLib.getDocument(this.src);
      loadingTask.promise.then(pdf => {
        pdf.getPage(1).then(page => {
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = this.$refs.pdfCanvas;
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          page.render({ canvasContext: context, viewport: viewport });
        });
      });
    }
  };
  </script>
  