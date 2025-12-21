"""
Automatic detection of configurable parameters from ComfyUI workflows
"""
from typing import Any
import random


# Parameter definitions for common node types
PARAMETER_DEFINITIONS = {
    "KSampler": {
        "seed": {
            "path": "inputs.seed",
            "param_type": "number",
            "label": "Seed",
            "min_value": -1,
            "max_value": 9999999999999999,
        },
        "steps": {
            "path": "inputs.steps",
            "param_type": "number",
            "label": "Steps",
            "min_value": 1,
            "max_value": 150,
        },
        "cfg": {
            "path": "inputs.cfg",
            "param_type": "number",
            "label": "CFG Scale",
            "min_value": 0,
            "max_value": 30,
        },
        "sampler_name": {
            "path": "inputs.sampler_name",
            "param_type": "dropdown",
            "label": "Sampler",
            "options": [
                "euler", "euler_ancestral", "heun", "dpm_2", "dpm_2_ancestral",
                "lms", "dpm_fast", "dpm_adaptive", "dpmpp_2s_ancestral",
                "dpmpp_sde", "dpmpp_2m", "ddim", "uni_pc"
            ],
        },
        "scheduler": {
            "path": "inputs.scheduler",
            "param_type": "dropdown",
            "label": "Scheduler",
            "options": ["normal", "karras", "exponential", "simple", "ddim_uniform"],
        },
        "denoise": {
            "path": "inputs.denoise",
            "param_type": "number",
            "label": "Denoise",
            "min_value": 0,
            "max_value": 1,
        },
    },
    "EmptyLatentImage": {
        "width": {
            "path": "inputs.width",
            "param_type": "number",
            "label": "Width",
            "min_value": 256,
            "max_value": 2048,
        },
        "height": {
            "path": "inputs.height",
            "param_type": "number",
            "label": "Height",
            "min_value": 256,
            "max_value": 2048,
        },
        "batch_size": {
            "path": "inputs.batch_size",
            "param_type": "number",
            "label": "Batch Size",
            "min_value": 1,
            "max_value": 10,
        },
    },
    "EmptySD3LatentImage": {
        "width": {
            "path": "inputs.width",
            "param_type": "number",
            "label": "Width",
            "min_value": 256,
            "max_value": 2048,
        },
        "height": {
            "path": "inputs.height",
            "param_type": "number",
            "label": "Height",
            "min_value": 256,
            "max_value": 2048,
        },
        "batch_size": {
            "path": "inputs.batch_size",
            "param_type": "number",
            "label": "Batch Size",
            "min_value": 1,
            "max_value": 10,
        },
    },
    "KSamplerAdvanced": {
        "seed": {
            "path": "inputs.seed",
            "param_type": "number",
            "label": "Seed",
            "min_value": -1,
            "max_value": 9999999999999999,
        },
        "steps": {
            "path": "inputs.steps",
            "param_type": "number",
            "label": "Steps",
            "min_value": 1,
            "max_value": 150,
        },
        "cfg": {
            "path": "inputs.cfg",
            "param_type": "number",
            "label": "CFG Scale",
            "min_value": 0,
            "max_value": 30,
        },
        "sampler_name": {
            "path": "inputs.sampler_name",
            "param_type": "dropdown",
            "label": "Sampler",
            "options": [
                "euler", "euler_ancestral", "heun", "dpm_2", "dpm_2_ancestral",
                "lms", "dpm_fast", "dpm_adaptive", "dpmpp_2s_ancestral",
                "dpmpp_sde", "dpmpp_2m", "ddim", "uni_pc"
            ],
        },
        "scheduler": {
            "path": "inputs.scheduler",
            "param_type": "dropdown",
            "label": "Scheduler",
            "options": ["normal", "karras", "exponential", "simple", "ddim_uniform"],
        },
        "noise_seed": {
            "path": "inputs.noise_seed",
            "param_type": "number",
            "label": "Noise Seed",
            "min_value": -1,
            "max_value": 9999999999999999,
        },
    },
}


def detect_configurable_params(workflow_json: dict[str, Any]) -> dict[str, Any]:
    """
    Detect configurable parameters from a ComfyUI workflow

    Args:
        workflow_json: The workflow JSON structure

    Returns:
        Dictionary mapping parameter names to their configurations
        Format: {
            "seed": {
                "node_id": "70:44",
                "path": "inputs.seed",
                "param_type": "number",
                "default": 123456,
                "label": "Seed",
                "min_value": -1,
                "max_value": 9999999999999999
            },
            ...
        }
    """
    configurable_params = {}

    # Iterate through all nodes in the workflow
    for node_id, node_data in workflow_json.items():
        if not isinstance(node_data, dict):
            continue

        class_type = node_data.get("class_type")
        if not class_type:
            continue

        # Check if this node type has configurable parameters
        if class_type not in PARAMETER_DEFINITIONS:
            continue

        node_params = PARAMETER_DEFINITIONS[class_type]
        inputs = node_data.get("inputs", {})

        # Extract each parameter
        for param_name, param_def in node_params.items():
            # Get the actual value from inputs
            input_key = param_def["path"].split(".")[-1]  # e.g., "inputs.seed" -> "seed"

            # Skip if this parameter doesn't exist in the node
            if input_key not in inputs:
                continue

            # Skip if the input is a connection (list format)
            if isinstance(inputs[input_key], list):
                continue

            default_value = inputs[input_key]

            # For seed parameters, use -1 to indicate random seed
            if param_name in ['seed', 'noise_seed']:
                default_value = -1

            # Build the parameter configuration
            param_config = {
                "node_id": node_id,
                "path": param_def["path"],
                "param_type": param_def["param_type"],
                "default": default_value,
                "label": param_def["label"],
            }

            # Add optional fields
            if "min_value" in param_def:
                param_config["min_value"] = param_def["min_value"]
            if "max_value" in param_def:
                param_config["max_value"] = param_def["max_value"]
            if "options" in param_def:
                param_config["options"] = param_def["options"]

            # Use a unique key combining param name with node id if there are duplicates
            param_key = param_name
            if param_key in configurable_params:
                param_key = f"{param_name}_{node_id.replace(':', '_')}"

            configurable_params[param_key] = param_config

    return configurable_params
