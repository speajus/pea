if (typeof import.meta.resolve === 'function') {
  console.log('This script is running directly.');
} else {
  console.log('This script is running as a module.');
}